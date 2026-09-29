BEGIN;

-- The applications RLS policy limits students to their own rows and a
-- withdrawn result, but RLS alone does not restrict which columns are changed.
-- Keep current Server Action updates working while preventing direct updates to
-- identity, drive, review, and other application fields.
REVOKE UPDATE ON TABLE public.applications FROM authenticated;
REVOKE UPDATE ON TABLE public.applications FROM anon;
GRANT UPDATE (status, updated_at) ON TABLE public.applications TO authenticated;

COMMIT;
