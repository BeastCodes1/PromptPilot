# Supabase setup for PromptPilot

## Option A: run the SQL in the Supabase dashboard

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in the Supabase dashboard.
3. Open [`schema.sql`](./schema.sql), copy its full contents, paste them into a new SQL query, and run it.
4. In **Authentication → Providers**, enable an authentication provider such as Email.
5. In **Table Editor**, confirm `public.projects` exists and Row Level Security is enabled.

## Option B: use the Supabase CLI

The `supabase/` folder contains a CLI config and a tracked migration.

1. Install the Supabase CLI using [Supabase's CLI instructions](https://supabase.com/docs/guides/cli).
2. From the project root, sign in and link your Supabase project:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Apply the migration:

   ```powershell
   npx supabase db push
   ```

Use either the dashboard SQL editor or the CLI migration to create the schema. The migration is tracked so future database changes can be added under `supabase/migrations/`.

The schema stores each project's plan, task state, launch checklist, and timestamps. The authenticated user's ID owns each row. RLS policies allow users to select, insert, update, and delete only their own rows. Anonymous users have no table access.

## Credentials

For the future app integration, retrieve the Project URL and publishable key from **Project Settings → API**. The current app does not use Supabase yet, so adding these values to Vercel or `.env.local` alone will not enable cloud saves.

When Supabase client integration is implemented, use server/client environment variables appropriate to that integration (commonly `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` or the current publishable key). A publishable/anon key is safe to expose only with RLS correctly enabled. Never place the `service_role` key in browser code or a `NEXT_PUBLIC_` variable.

## Current limitation

This file creates the database table and its access controls only. PromptPilot still saves projects in browser localStorage until Supabase Auth and database operations are added to the application.
