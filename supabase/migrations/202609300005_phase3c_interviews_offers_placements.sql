BEGIN;

-- drive_rounds describe drive-wide rounds. Phase 3C needs a per-application
-- interview record, while offer and placement rows already exist in the app's
-- established schema and are intentionally reused below.
CREATE TABLE IF NOT EXISTS public.application_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  mode text NOT NULL CHECK (mode IN ('online', 'onsite', 'phone')),
  location text NOT NULL DEFAULT '',
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(details) <= 2000),
  CHECK (length(location) <= 500)
);
CREATE INDEX IF NOT EXISTS application_interviews_application_id_idx
  ON public.application_interviews(application_id);

CREATE TABLE IF NOT EXISTS public.interview_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL UNIQUE REFERENCES public.application_interviews(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES public.profiles(id),
  score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  feedback text NOT NULL CHECK (length(btrim(feedback)) BETWEEN 1 AND 5000),
  recommendation text NOT NULL CHECK (recommendation IN ('select', 'reject', 'undecided')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS interview_evaluations_application_id_idx
  ON public.interview_evaluations(application_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.placement_offers'::regclass
      AND conname = 'phase3c_one_offer_per_application'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM public.placement_offers
      GROUP BY application_id HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION 'Resolve duplicate placement offers before applying Phase 3C';
    END IF;
    ALTER TABLE public.placement_offers
      ADD CONSTRAINT phase3c_one_offer_per_application UNIQUE (application_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.placement_offers'::regclass
      AND conname = 'phase3c_placement_offer_amount_positive'
  ) THEN
    ALTER TABLE public.placement_offers
      ADD CONSTRAINT phase3c_placement_offer_amount_positive CHECK (offered_ctc > 0);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_phase3c_interview_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  application_status text;
BEGIN
  SELECT application.status::text INTO application_status
  FROM public.applications AS application
  WHERE application.id = NEW.application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Interview application not found' USING ERRCODE = '23503';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF application_status <> 'shortlisted' OR NEW.status <> 'scheduled' THEN
      RAISE EXCEPTION 'Only shortlisted applications can be scheduled for interview' USING ERRCODE = '23514';
    END IF;
    IF NEW.scheduled_at <= now() THEN
      RAISE EXCEPTION 'Interview must be scheduled in the future' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.application_id <> OLD.application_id THEN
    RAISE EXCEPTION 'Interview application cannot be changed' USING ERRCODE = '23514';
  END IF;
  IF application_status <> 'shortlisted' THEN
    RAISE EXCEPTION 'Interview details can only change while the application is shortlisted' USING ERRCODE = '23514';
  END IF;

  IF NEW.status <> OLD.status AND NOT (OLD.status = 'scheduled' AND NEW.status IN ('completed', 'cancelled')) THEN
    RAISE EXCEPTION 'Invalid interview status transition' USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'scheduled' AND NEW.scheduled_at <= now() THEN
    RAISE EXCEPTION 'Interview must be scheduled in the future' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_phase3c_interview_rules() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS phase3c_interview_rules ON public.application_interviews;
CREATE TRIGGER phase3c_interview_rules
  BEFORE INSERT OR UPDATE ON public.application_interviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_phase3c_interview_rules();

CREATE OR REPLACE FUNCTION public.enforce_phase3c_evaluation_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  interview_application_id uuid;
  interview_status text;
  application_status text;
BEGIN
  SELECT interview.application_id, interview.status
    INTO interview_application_id, interview_status
  FROM public.application_interviews AS interview
  WHERE interview.id = NEW.interview_id;

  IF NOT FOUND OR interview_application_id <> NEW.application_id THEN
    RAISE EXCEPTION 'Evaluation must match its interview application' USING ERRCODE = '23514';
  END IF;
  IF interview_status <> 'completed' THEN
    RAISE EXCEPTION 'Only completed interviews can be evaluated' USING ERRCODE = '23514';
  END IF;
  SELECT application.status::text INTO application_status
  FROM public.applications AS application
  WHERE application.id = NEW.application_id;
  IF application_status <> 'shortlisted' THEN
    RAISE EXCEPTION 'Only shortlisted applications can be evaluated' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.interview_id <> OLD.interview_id OR NEW.application_id <> OLD.application_id) THEN
    RAISE EXCEPTION 'Evaluation scope cannot be changed' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_phase3c_evaluation_scope() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS phase3c_evaluation_scope ON public.interview_evaluations;
CREATE TRIGGER phase3c_evaluation_scope
  BEFORE INSERT OR UPDATE ON public.interview_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_phase3c_evaluation_scope();

-- Extend the existing Phase 3B trigger's graph; all earlier transitions
-- remain valid, and final decisions require a completed interview evaluation.
CREATE OR REPLACE FUNCTION public.enforce_phase3b_application_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status::text = OLD.status::text THEN
    RETURN NEW;
  END IF;

  IF (OLD.status::text = 'applied' AND NEW.status::text IN ('eligible', 'ineligible'))
     OR (OLD.status::text = 'eligible' AND NEW.status::text IN ('shortlisted', 'rejected')) THEN
    RETURN NEW;
  END IF;

  IF OLD.status::text = 'shortlisted'
     AND NEW.status::text IN ('selected', 'rejected')
     AND EXISTS (
       SELECT 1
       FROM public.application_interviews AS interview
       JOIN public.interview_evaluations AS evaluation
         ON evaluation.interview_id = interview.id
        AND evaluation.application_id = interview.application_id
       WHERE interview.application_id = OLD.id
         AND interview.status = 'completed'
     ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid application status transition' USING ERRCODE = '23514';
END;
$$;

ALTER TABLE public.application_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Phase 3C interview select" ON public.application_interviews;
DROP POLICY IF EXISTS "Phase 3C interview select restriction" ON public.application_interviews;
DROP POLICY IF EXISTS "Phase 3C interview insert" ON public.application_interviews;
DROP POLICY IF EXISTS "Phase 3C interview insert restriction" ON public.application_interviews;
DROP POLICY IF EXISTS "Phase 3C interview update" ON public.application_interviews;
DROP POLICY IF EXISTS "Phase 3C interview update restriction" ON public.application_interviews;
DROP POLICY IF EXISTS "Phase 3C interview delete deny" ON public.application_interviews;
DROP POLICY IF EXISTS "Phase 3C interview anon deny" ON public.application_interviews;

CREATE POLICY "Phase 3C interview select" ON public.application_interviews FOR SELECT TO authenticated
USING (
  public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
  OR (public.get_my_role() = 'student' AND EXISTS (
    SELECT 1 FROM public.applications AS application
    JOIN public.student_profiles AS student ON student.id = application.student_id
    JOIN public.profiles AS account ON account.id = student.profile_id
    WHERE application.id = application_interviews.application_id
      AND account.user_id = auth.uid() AND account.role = 'student'
  ))
);
CREATE POLICY "Phase 3C interview select restriction" AS RESTRICTIVE ON public.application_interviews FOR SELECT TO authenticated
USING (
  public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
  OR (public.get_my_role() = 'student' AND EXISTS (
    SELECT 1 FROM public.applications AS application
    JOIN public.student_profiles AS student ON student.id = application.student_id
    JOIN public.profiles AS account ON account.id = student.profile_id
    WHERE application.id = application_interviews.application_id
      AND account.user_id = auth.uid() AND account.role = 'student'
  ))
);
CREATE POLICY "Phase 3C interview insert" ON public.application_interviews FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
  AND status = 'scheduled'
  AND created_by = (SELECT profile.id FROM public.profiles AS profile WHERE profile.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.applications AS application
    WHERE application.id = application_interviews.application_id AND application.status::text = 'shortlisted')
);
CREATE POLICY "Phase 3C interview insert restriction" AS RESTRICTIVE ON public.application_interviews FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
  AND status = 'scheduled'
  AND created_by = (SELECT profile.id FROM public.profiles AS profile WHERE profile.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.applications AS application
    WHERE application.id = application_interviews.application_id AND application.status::text = 'shortlisted')
);
CREATE POLICY "Phase 3C interview update" ON public.application_interviews FOR UPDATE TO authenticated
USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]))
WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3C interview update restriction" AS RESTRICTIVE ON public.application_interviews FOR UPDATE TO authenticated
USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]))
WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3C interview delete deny" AS RESTRICTIVE ON public.application_interviews FOR DELETE TO authenticated USING (false);
CREATE POLICY "Phase 3C interview anon deny" AS RESTRICTIVE ON public.application_interviews FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Phase 3C evaluation select" ON public.interview_evaluations;
DROP POLICY IF EXISTS "Phase 3C evaluation select restriction" ON public.interview_evaluations;
DROP POLICY IF EXISTS "Phase 3C evaluation insert" ON public.interview_evaluations;
DROP POLICY IF EXISTS "Phase 3C evaluation insert restriction" ON public.interview_evaluations;
DROP POLICY IF EXISTS "Phase 3C evaluation update" ON public.interview_evaluations;
DROP POLICY IF EXISTS "Phase 3C evaluation update restriction" ON public.interview_evaluations;
DROP POLICY IF EXISTS "Phase 3C evaluation delete deny" ON public.interview_evaluations;
DROP POLICY IF EXISTS "Phase 3C evaluation anon deny" ON public.interview_evaluations;

CREATE POLICY "Phase 3C evaluation select" ON public.interview_evaluations FOR SELECT TO authenticated
USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3C evaluation select restriction" AS RESTRICTIVE ON public.interview_evaluations FOR SELECT TO authenticated
USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3C evaluation insert" ON public.interview_evaluations FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
  AND evaluator_id = (SELECT profile.id FROM public.profiles AS profile WHERE profile.user_id = auth.uid())
);
CREATE POLICY "Phase 3C evaluation insert restriction" AS RESTRICTIVE ON public.interview_evaluations FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
  AND evaluator_id = (SELECT profile.id FROM public.profiles AS profile WHERE profile.user_id = auth.uid())
);
CREATE POLICY "Phase 3C evaluation update" ON public.interview_evaluations FOR UPDATE TO authenticated
USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]))
WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3C evaluation update restriction" AS RESTRICTIVE ON public.interview_evaluations FOR UPDATE TO authenticated
USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]))
WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3C evaluation delete deny" AS RESTRICTIVE ON public.interview_evaluations FOR DELETE TO authenticated USING (false);
CREATE POLICY "Phase 3C evaluation anon deny" AS RESTRICTIVE ON public.interview_evaluations FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Phase 3C offer select" ON public.placement_offers;
DROP POLICY IF EXISTS "Phase 3C offer select restriction" ON public.placement_offers;
DROP POLICY IF EXISTS "Phase 3C offer insert" ON public.placement_offers;
DROP POLICY IF EXISTS "Phase 3C offer insert restriction" ON public.placement_offers;
DROP POLICY IF EXISTS "Phase 3C offer response" ON public.placement_offers;
DROP POLICY IF EXISTS "Phase 3C offer response restriction" ON public.placement_offers;
DROP POLICY IF EXISTS "Phase 3C offer delete deny" ON public.placement_offers;
DROP POLICY IF EXISTS "Phase 3C offer anon deny" ON public.placement_offers;

CREATE POLICY "Phase 3C offer select" ON public.placement_offers FOR SELECT TO authenticated
USING (
  public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
  OR (public.get_my_role() = 'student' AND EXISTS (
    SELECT 1 FROM public.profiles AS account
    WHERE account.id = placement_offers.student_id
      AND account.user_id = auth.uid() AND account.role = 'student'
  ))
);
CREATE POLICY "Phase 3C offer select restriction" AS RESTRICTIVE ON public.placement_offers FOR SELECT TO authenticated
USING (
  public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
  OR (public.get_my_role() = 'student' AND EXISTS (
    SELECT 1 FROM public.profiles AS account
    WHERE account.id = placement_offers.student_id
      AND account.user_id = auth.uid() AND account.role = 'student'
  ))
);
CREATE POLICY "Phase 3C offer insert" ON public.placement_offers FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
  AND is_accepted IS NULL
  AND EXISTS (SELECT 1 FROM public.applications AS application
    WHERE application.id = placement_offers.application_id
      AND application.status::text = 'selected'
      AND EXISTS (SELECT 1 FROM public.student_profiles AS student
        WHERE student.id = application.student_id AND student.profile_id = placement_offers.student_id)
      AND application.drive_id = placement_offers.drive_id)
);
CREATE POLICY "Phase 3C offer insert restriction" AS RESTRICTIVE ON public.placement_offers FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
  AND is_accepted IS NULL
  AND EXISTS (SELECT 1 FROM public.applications AS application
    WHERE application.id = placement_offers.application_id
      AND application.status::text = 'selected'
      AND EXISTS (SELECT 1 FROM public.student_profiles AS student
        WHERE student.id = application.student_id AND student.profile_id = placement_offers.student_id)
      AND application.drive_id = placement_offers.drive_id)
);
CREATE POLICY "Phase 3C offer response" ON public.placement_offers FOR UPDATE TO authenticated
USING (
  public.get_my_role() = 'student' AND is_accepted IS NULL
  AND EXISTS (SELECT 1 FROM public.profiles AS account
    WHERE account.id = placement_offers.student_id
      AND account.user_id = auth.uid() AND account.role = 'student')
)
WITH CHECK (
  public.get_my_role() = 'student' AND is_accepted IS NOT NULL AND decided_at IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.profiles AS account
    WHERE account.id = placement_offers.student_id
      AND account.user_id = auth.uid() AND account.role = 'student')
);
CREATE POLICY "Phase 3C offer response restriction" AS RESTRICTIVE ON public.placement_offers FOR UPDATE TO authenticated
USING (
  public.get_my_role() = 'student' AND is_accepted IS NULL
  AND EXISTS (SELECT 1 FROM public.profiles AS account
    WHERE account.id = placement_offers.student_id
      AND account.user_id = auth.uid() AND account.role = 'student')
)
WITH CHECK (
  public.get_my_role() = 'student' AND is_accepted IS NOT NULL AND decided_at IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.profiles AS account
    WHERE account.id = placement_offers.student_id
      AND account.user_id = auth.uid() AND account.role = 'student')
);
CREATE POLICY "Phase 3C offer delete deny" AS RESTRICTIVE ON public.placement_offers FOR DELETE TO authenticated USING (false);
CREATE POLICY "Phase 3C offer anon deny" AS RESTRICTIVE ON public.placement_offers FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.enforce_phase3c_offer_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_accepted IS NULL AND NEW.is_accepted IN (true, false) THEN
    IF NEW.application_id <> OLD.application_id
       OR NEW.student_id <> OLD.student_id
       OR NEW.drive_id <> OLD.drive_id
       OR NEW.offered_ctc <> OLD.offered_ctc
       OR NEW.offer_letter_path IS DISTINCT FROM OLD.offer_letter_path THEN
      RAISE EXCEPTION 'Offer details cannot change after creation' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.is_accepted IS NOT DISTINCT FROM OLD.is_accepted THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Invalid offer status transition' USING ERRCODE = '23514';
END;
$$;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_phase3c_offer_transition() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS phase3c_offer_transition ON public.placement_offers;
CREATE TRIGGER phase3c_offer_transition
  BEFORE UPDATE OF is_accepted ON public.placement_offers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_phase3c_offer_transition();

CREATE OR REPLACE FUNCTION public.create_phase3c_placement_after_offer_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_accepted IS NULL AND NEW.is_accepted IS TRUE THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.applications AS application
      JOIN public.student_profiles AS student ON student.id = application.student_id
      WHERE application.id = NEW.application_id
        AND application.status::text = 'selected'
        AND student.profile_id = NEW.student_id
        AND application.drive_id = NEW.drive_id
    ) THEN
      RAISE EXCEPTION 'Accepted offer does not match a selected application' USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.placements (
      application_id, student_id, drive_id, company_id, job_title,
      package_lpa, offer_status, placement_date, joining_date
    )
    SELECT application.id, application.student_id, application.drive_id,
      drive.company_id, drive.title, NEW.offered_ctc, 'accepted', NULL, NULL
    FROM public.applications AS application
    JOIN public.student_profiles AS student ON student.id = application.student_id
    JOIN public.placement_drives AS drive ON drive.id = application.drive_id
    WHERE application.id = NEW.application_id
      AND application.status::text = 'selected'
      AND student.profile_id = NEW.student_id
      AND application.drive_id = NEW.drive_id
    ON CONFLICT (application_id) DO NOTHING;

    IF NOT EXISTS (
      SELECT 1 FROM public.placements AS placement
      WHERE placement.application_id = NEW.application_id
        AND placement.drive_id = NEW.drive_id
        AND placement.student_id = (SELECT application.student_id FROM public.applications AS application WHERE application.id = NEW.application_id)
        AND placement.package_lpa = NEW.offered_ctc
        AND placement.offer_status = 'accepted'
    ) THEN
      RAISE EXCEPTION 'Accepted offer does not match a selected application' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL PRIVILEGES ON FUNCTION public.create_phase3c_placement_after_offer_acceptance() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS phase3c_create_placement_after_offer_acceptance ON public.placement_offers;
CREATE TRIGGER phase3c_create_placement_after_offer_acceptance
  AFTER UPDATE OF is_accepted ON public.placement_offers
  FOR EACH ROW EXECUTE FUNCTION public.create_phase3c_placement_after_offer_acceptance();

DROP POLICY IF EXISTS "Phase 3C placement select" ON public.placements;
DROP POLICY IF EXISTS "Phase 3C placement select restriction" ON public.placements;
DROP POLICY IF EXISTS "Phase 3C placement insert" ON public.placements;
DROP POLICY IF EXISTS "Phase 3C placement insert restriction" ON public.placements;
DROP POLICY IF EXISTS "Phase 3C placement update" ON public.placements;
DROP POLICY IF EXISTS "Phase 3C placement update restriction" ON public.placements;
DROP POLICY IF EXISTS "Phase 3C placement delete deny" ON public.placements;
DROP POLICY IF EXISTS "Phase 3C placement anon deny" ON public.placements;

CREATE POLICY "Phase 3C placement select" ON public.placements FOR SELECT TO authenticated
USING (
  public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
  OR (public.get_my_role() = 'student' AND EXISTS (
    SELECT 1 FROM public.student_profiles AS student
    JOIN public.profiles AS account ON account.id = student.profile_id
    WHERE student.id = placements.student_id
      AND account.user_id = auth.uid() AND account.role = 'student'
  ))
);
CREATE POLICY "Phase 3C placement select restriction" AS RESTRICTIVE ON public.placements FOR SELECT TO authenticated
USING (
  public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
  OR (public.get_my_role() = 'student' AND EXISTS (
    SELECT 1 FROM public.student_profiles AS student
    JOIN public.profiles AS account ON account.id = student.profile_id
    WHERE student.id = placements.student_id
      AND account.user_id = auth.uid() AND account.role = 'student'
  ))
);
CREATE POLICY "Phase 3C placement insert" ON public.placements FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
  AND offer_status = 'accepted'
  AND EXISTS (SELECT 1 FROM public.placement_offers AS offer
    WHERE offer.application_id = placements.application_id
      AND offer.drive_id = placements.drive_id
      AND EXISTS (SELECT 1 FROM public.applications AS application
        JOIN public.student_profiles AS student ON student.id = application.student_id
        WHERE application.id = placements.application_id
          AND application.student_id = placements.student_id
          AND application.drive_id = placements.drive_id
          AND student.profile_id = offer.student_id)
      AND offer.is_accepted IS TRUE)
);
CREATE POLICY "Phase 3C placement insert restriction" AS RESTRICTIVE ON public.placements FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
  AND offer_status = 'accepted'
  AND EXISTS (SELECT 1 FROM public.placement_offers AS offer
    WHERE offer.application_id = placements.application_id
      AND offer.drive_id = placements.drive_id
      AND EXISTS (SELECT 1 FROM public.applications AS application
        JOIN public.student_profiles AS student ON student.id = application.student_id
        WHERE application.id = placements.application_id
          AND application.student_id = placements.student_id
          AND application.drive_id = placements.drive_id
          AND student.profile_id = offer.student_id)
      AND offer.is_accepted IS TRUE)
);
CREATE POLICY "Phase 3C placement update" ON public.placements FOR UPDATE TO authenticated
USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]))
WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3C placement update restriction" AS RESTRICTIVE ON public.placements FOR UPDATE TO authenticated
USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]))
WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3C placement delete deny" AS RESTRICTIVE ON public.placements FOR DELETE TO authenticated USING (false);
CREATE POLICY "Phase 3C placement anon deny" AS RESTRICTIVE ON public.placements FOR ALL TO anon USING (false) WITH CHECK (false);

REVOKE ALL PRIVILEGES ON TABLE public.application_interviews, public.interview_evaluations, public.placement_offers, public.placements FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.application_interviews, public.interview_evaluations FROM anon;
GRANT SELECT ON TABLE public.application_interviews, public.interview_evaluations TO authenticated;
GRANT INSERT (application_id, scheduled_at, mode, location, details, status, created_by)
  ON TABLE public.application_interviews TO authenticated;
GRANT UPDATE (scheduled_at, mode, location, details, status, updated_at)
  ON TABLE public.application_interviews TO authenticated;
GRANT INSERT (interview_id, application_id, evaluator_id, score, feedback, recommendation)
  ON TABLE public.interview_evaluations TO authenticated;
GRANT UPDATE (score, feedback, recommendation, updated_at)
  ON TABLE public.interview_evaluations TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.placement_offers FROM authenticated, anon;
GRANT SELECT ON TABLE public.placement_offers TO authenticated;
REVOKE INSERT (id, application_id, student_id, drive_id, offered_ctc, offer_letter_path, is_accepted, decided_at, created_at)
  ON TABLE public.placement_offers FROM authenticated;
GRANT INSERT (application_id, student_id, drive_id, offered_ctc, offer_letter_path)
  ON TABLE public.placement_offers TO authenticated;
REVOKE UPDATE (id, application_id, student_id, drive_id, offered_ctc, offer_letter_path, is_accepted, decided_at, created_at)
  ON TABLE public.placement_offers FROM authenticated;
GRANT UPDATE (is_accepted, decided_at) ON TABLE public.placement_offers TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.placements FROM authenticated;
GRANT SELECT ON TABLE public.placements TO authenticated;
REVOKE INSERT (id, application_id, student_id, drive_id, company_id, job_title, package_lpa, offer_status, placement_date, joining_date, created_at)
  ON TABLE public.placements FROM authenticated;
REVOKE INSERT (application_id, student_id, drive_id, company_id, job_title, package_lpa, offer_status, placement_date, joining_date)
  ON TABLE public.placements FROM authenticated;
REVOKE UPDATE (id, application_id, student_id, drive_id, company_id, job_title, package_lpa, offer_status, placement_date, joining_date, created_at)
  ON TABLE public.placements FROM authenticated;
GRANT UPDATE (placement_date, joining_date) ON TABLE public.placements TO authenticated;

COMMIT;
