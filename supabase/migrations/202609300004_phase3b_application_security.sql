BEGIN;

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Phase 3B application select" ON public.applications;
DROP POLICY IF EXISTS "Phase 3B application select restriction" ON public.applications;
DROP POLICY IF EXISTS "Phase 3B application insert" ON public.applications;
DROP POLICY IF EXISTS "Phase 3B application insert restriction" ON public.applications;
DROP POLICY IF EXISTS "Phase 3B application update" ON public.applications;
DROP POLICY IF EXISTS "Phase 3B application update restriction" ON public.applications;
DROP POLICY IF EXISTS "Phase 3B deny application delete" ON public.applications;
DROP POLICY IF EXISTS "Phase 3B deny anonymous applications" ON public.applications;

CREATE POLICY "Phase 3B application select"
  ON public.applications FOR SELECT TO authenticated
  USING (
    public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
    OR (
      public.get_my_role() = 'student'
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles AS student
        JOIN public.profiles AS account ON account.id = student.profile_id
        WHERE student.id = applications.student_id
          AND account.user_id = auth.uid()
          AND account.role = 'student'
      )
    )
  );
CREATE POLICY "Phase 3B application select restriction"
  AS RESTRICTIVE ON public.applications FOR SELECT TO authenticated
  USING (
    public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
    OR (
      public.get_my_role() = 'student'
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles AS student
        JOIN public.profiles AS account ON account.id = student.profile_id
        WHERE student.id = applications.student_id
          AND account.user_id = auth.uid()
          AND account.role = 'student'
      )
    )
  );

CREATE POLICY "Phase 3B application insert"
  ON public.applications FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() = 'student'
    AND status::text = 'applied'
    AND EXISTS (
      SELECT 1
      FROM public.student_profiles AS student
      JOIN public.profiles AS account ON account.id = student.profile_id
      JOIN public.placement_drives AS drive ON drive.id = applications.drive_id
      WHERE student.id = applications.student_id
        AND account.user_id = auth.uid()
        AND account.role = 'student'
        AND student.resume_path IS NOT NULL
        AND length(btrim(student.resume_path)) > 0
        AND drive.status = 'published'
        AND drive.registration_deadline > now()
        AND (
          drive.min_cgpa IS NULL
          OR (student.cgpa IS NOT NULL AND student.cgpa >= drive.min_cgpa)
        )
        AND (
          coalesce(cardinality(drive.allowed_departments), 0) = 0
          OR lower(btrim(student.department)) = ANY (
            ARRAY(
              SELECT lower(btrim(allowed.department))
              FROM unnest(drive.allowed_departments) AS allowed(department)
            )
          )
        )
        AND student.backlogs IS NOT NULL
        AND student.backlogs >= 0
        AND student.backlogs <= coalesce(drive.max_backlogs, 0)
    )
  );
CREATE POLICY "Phase 3B application insert restriction"
  AS RESTRICTIVE ON public.applications FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() = 'student'
    AND status::text = 'applied'
    AND EXISTS (
      SELECT 1
      FROM public.student_profiles AS student
      JOIN public.profiles AS account ON account.id = student.profile_id
      JOIN public.placement_drives AS drive ON drive.id = applications.drive_id
      WHERE student.id = applications.student_id
        AND account.user_id = auth.uid()
        AND account.role = 'student'
        AND student.resume_path IS NOT NULL
        AND length(btrim(student.resume_path)) > 0
        AND drive.status = 'published'
        AND drive.registration_deadline > now()
        AND (
          drive.min_cgpa IS NULL
          OR (student.cgpa IS NOT NULL AND student.cgpa >= drive.min_cgpa)
        )
        AND (
          coalesce(cardinality(drive.allowed_departments), 0) = 0
          OR lower(btrim(student.department)) = ANY (
            ARRAY(
              SELECT lower(btrim(allowed.department))
              FROM unnest(drive.allowed_departments) AS allowed(department)
            )
          )
        )
        AND student.backlogs IS NOT NULL
        AND student.backlogs >= 0
        AND student.backlogs <= coalesce(drive.max_backlogs, 0)
    )
  );

CREATE POLICY "Phase 3B application update"
  ON public.applications FOR UPDATE TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]))
  WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3B application update restriction"
  AS RESTRICTIVE ON public.applications FOR UPDATE TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]))
  WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));

CREATE POLICY "Phase 3B deny application delete"
  AS RESTRICTIVE ON public.applications FOR DELETE TO authenticated
  USING (false);
CREATE POLICY "Phase 3B deny anonymous applications"
  AS RESTRICTIVE ON public.applications FOR ALL TO anon
  USING (false) WITH CHECK (false);

REVOKE INSERT ON TABLE public.applications FROM authenticated, anon;
GRANT INSERT (drive_id, student_id, status, applied_at, created_at, updated_at)
  ON TABLE public.applications TO authenticated;
REVOKE DELETE ON TABLE public.applications FROM authenticated, anon;
REVOKE UPDATE ON TABLE public.applications FROM authenticated, anon;
GRANT UPDATE (status, updated_at) ON TABLE public.applications TO authenticated;

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

  RAISE EXCEPTION 'Invalid Phase 3B application status transition'
    USING ERRCODE = '23514';
END;
$$;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_phase3b_application_status_transition() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS "Phase 3B application status transition" ON public.applications;
CREATE TRIGGER "Phase 3B application status transition"
  BEFORE UPDATE OF status ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_phase3b_application_status_transition();

COMMIT;
