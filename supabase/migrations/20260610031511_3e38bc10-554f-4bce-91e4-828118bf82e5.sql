
DO $mig$
DECLARE
  r RECORD;
  new_qual TEXT;
  new_check TEXT;
  stmt TEXT;
  touched INT := 0;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual IS NOT NULL AND qual ~ 'auth\.uid\(\)'
           AND qual !~* '\(\s*select\s+auth\.uid\(\)\s*\)')
        OR
        (with_check IS NOT NULL AND with_check ~ 'auth\.uid\(\)'
           AND with_check !~* '\(\s*select\s+auth\.uid\(\)\s*\)')
      )
  LOOP
    -- Safely wrap auth.uid() without double-wrapping any already-wrapped occurrences.
    -- Step 1: protect already-wrapped forms with a sentinel.
    new_qual  := r.qual;
    new_check := r.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual,  '\(\s*select\s+auth\.uid\(\)\s*\)', '__WRAPPED_UID__', 'gi');
      new_qual := regexp_replace(new_qual,  'auth\.uid\(\)', '(SELECT auth.uid())', 'g');
      new_qual := replace(new_qual, '__WRAPPED_UID__', '(SELECT auth.uid())');
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, '\(\s*select\s+auth\.uid\(\)\s*\)', '__WRAPPED_UID__', 'gi');
      new_check := regexp_replace(new_check, 'auth\.uid\(\)', '(SELECT auth.uid())', 'g');
      new_check := replace(new_check, '__WRAPPED_UID__', '(SELECT auth.uid())');
    END IF;

    stmt := format('ALTER POLICY %I ON %I.%I',
                   r.policyname, r.schemaname, r.tablename);

    -- USING applies to SELECT/UPDATE/DELETE/ALL (not INSERT)
    IF r.qual IS NOT NULL AND upper(r.cmd) <> 'INSERT' THEN
      stmt := stmt || format(' USING (%s)', new_qual);
    END IF;

    -- WITH CHECK applies to INSERT/UPDATE/ALL (not SELECT/DELETE)
    IF r.with_check IS NOT NULL AND upper(r.cmd) NOT IN ('SELECT','DELETE') THEN
      stmt := stmt || format(' WITH CHECK (%s)', new_check);
    END IF;

    RAISE NOTICE '%', stmt;
    EXECUTE stmt;
    touched := touched + 1;
  END LOOP;

  RAISE NOTICE 'RLS wrap migration: % policies updated', touched;
END
$mig$;
