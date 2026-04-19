# Supabase setup

1. Open your Supabase project → SQL editor.
2. Paste the contents of `migrations/0001_init.sql` and run it.
3. Verify in Table Editor that `connections`, `jobs`, `digests`, and `pr_classifications` tables exist.
4. Verify in Storage that a private `media` bucket exists.

The app uses the **service role key** server-side; RLS is off for this session.
