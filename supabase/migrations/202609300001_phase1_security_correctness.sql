BEGIN;

-- Staff may read student-facing profile data required by applicant workflows.
-- get_my_role() is SECURITY DEFINER, so these checks do not recurse through RLS.
CREATE POLICY "Staff can view student profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    role = 'student'
    AND public.get_my_role() = ANY (ARRAY['tpo', 'coordinator', 'admin']::text[])
  );

CREATE POLICY "Staff can view student academic profiles"
  ON public.student_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = ANY (ARRAY['tpo', 'coordinator', 'admin']::text[])
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS student_account
      WHERE student_account.id = student_profiles.profile_id
        AND student_account.role = 'student'
    )
  );

-- The live bucket ID is case-sensitive and is "Resumes". Rebind existing
-- ownership policies to that bucket without changing their ownership rules.
DROP POLICY IF EXISTS "Authorized users can view resumes" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload own resume" ON storage.objects;
DROP POLICY IF EXISTS "Students can update own resume" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete own resume" ON storage.objects;

CREATE POLICY "Authorized users can view resumes"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'Resumes'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR (
        public.get_my_role() = ANY (ARRAY['tpo', 'coordinator', 'admin']::text[])
        AND EXISTS (
          SELECT 1
          FROM public.applications AS application
          JOIN public.student_profiles AS student
            ON student.id = application.student_id
          JOIN public.profiles AS student_account
            ON student_account.id = student.profile_id
          WHERE student_account.user_id::text = (storage.foldername(name))[1]
        )
      )
    )
  );

CREATE POLICY "Students can upload own resume"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'Resumes'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND public.get_my_role() = 'student'
  );

CREATE POLICY "Students can update own resume"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'Resumes'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND public.get_my_role() = 'student'
  )
  WITH CHECK (
    bucket_id = 'Resumes'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND public.get_my_role() = 'student'
  );

CREATE POLICY "Students can delete own resume"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'Resumes'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND public.get_my_role() = 'student'
  );

COMMIT;
