BEGIN;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_drives ENABLE ROW LEVEL SECURITY;

-- Staff can manage company rows. Student access to public company fields is
-- provided by a restricted view below so HR contact columns stay private.
DROP POLICY IF EXISTS "Phase 3A company select" ON public.companies;
DROP POLICY IF EXISTS "Phase 3A company select restriction" ON public.companies;
DROP POLICY IF EXISTS "Phase 3A company insert" ON public.companies;
DROP POLICY IF EXISTS "Phase 3A company insert restriction" ON public.companies;
DROP POLICY IF EXISTS "Phase 3A company update" ON public.companies;
DROP POLICY IF EXISTS "Phase 3A company update restriction" ON public.companies;
DROP POLICY IF EXISTS "Phase 3A company delete" ON public.companies;
DROP POLICY IF EXISTS "Phase 3A company delete restriction" ON public.companies;
DROP POLICY IF EXISTS "Phase 3A deny anonymous company access" ON public.companies;

CREATE POLICY "Phase 3A company select"
  ON public.companies FOR SELECT TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3A company select restriction"
  AS RESTRICTIVE ON public.companies FOR SELECT TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));

CREATE OR REPLACE VIEW public.published_drive_companies
  WITH (security_barrier = true)
AS
  SELECT DISTINCT company.id, company.name, company.website,
         company.industry, company.description, company.location
  FROM public.companies AS company
  JOIN public.placement_drives AS drive ON drive.company_id = company.id
  WHERE drive.status = 'published' AND public.get_my_role() = 'student';
REVOKE ALL PRIVILEGES ON TABLE public.published_drive_companies FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.published_drive_companies TO authenticated;

CREATE POLICY "Phase 3A company insert"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3A company insert restriction"
  AS RESTRICTIVE ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3A company update"
  ON public.companies FOR UPDATE TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]))
  WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3A company update restriction"
  AS RESTRICTIVE ON public.companies FOR UPDATE TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]))
  WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3A company delete"
  ON public.companies FOR DELETE TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3A company delete restriction"
  AS RESTRICTIVE ON public.companies FOR DELETE TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3A deny anonymous company access"
  AS RESTRICTIVE ON public.companies FOR ALL TO anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Phase 3A drive select" ON public.placement_drives;
DROP POLICY IF EXISTS "Phase 3A drive select restriction" ON public.placement_drives;
DROP POLICY IF EXISTS "Phase 3A drive insert" ON public.placement_drives;
DROP POLICY IF EXISTS "Phase 3A drive insert restriction" ON public.placement_drives;
DROP POLICY IF EXISTS "Phase 3A drive update" ON public.placement_drives;
DROP POLICY IF EXISTS "Phase 3A drive update restriction" ON public.placement_drives;
DROP POLICY IF EXISTS "Phase 3A drive delete" ON public.placement_drives;
DROP POLICY IF EXISTS "Phase 3A drive delete restriction" ON public.placement_drives;
DROP POLICY IF EXISTS "Phase 3A deny anonymous drive access" ON public.placement_drives;

CREATE POLICY "Phase 3A drive select"
  ON public.placement_drives FOR SELECT TO authenticated
  USING (
    public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
    OR (public.get_my_role() = 'student' AND status = 'published')
  );
CREATE POLICY "Phase 3A drive select restriction"
  AS RESTRICTIVE ON public.placement_drives FOR SELECT TO authenticated
  USING (
    public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[])
    OR (public.get_my_role() = 'student' AND status = 'published')
  );
CREATE POLICY "Phase 3A drive insert"
  ON public.placement_drives FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3A drive insert restriction"
  AS RESTRICTIVE ON public.placement_drives FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3A drive update"
  ON public.placement_drives FOR UPDATE TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]))
  WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3A drive update restriction"
  AS RESTRICTIVE ON public.placement_drives FOR UPDATE TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]))
  WITH CHECK (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3A drive delete"
  ON public.placement_drives FOR DELETE TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3A drive delete restriction"
  AS RESTRICTIVE ON public.placement_drives FOR DELETE TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['admin', 'tpo', 'coordinator']::text[]));
CREATE POLICY "Phase 3A deny anonymous drive access"
  AS RESTRICTIVE ON public.placement_drives FOR ALL TO anon
  USING (false) WITH CHECK (false);

COMMIT;
