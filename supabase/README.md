# Supabase setup for PromptPilot

## Option A: run the SQL in the Supabase dashboard

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in the Supabase dashboard.
3. Open [`schema.sql`](./schema.sql), copy its full contents, paste them into a new SQL query, and run it.
4. In **Authentication → Providers**, enable Email/password sign-in.
5. In **Authentication → URL Configuration**, set the Site URL to `http://localhost:3000` for local development. Add your deployed Vercel URL to the allowed redirect URLs when you deploy.
6. In **Table Editor**, confirm `public.projects` exists and Row Level Security is enabled.

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

Retrieve the Project URL and publishable key from **Project Settings → API** and set them in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Restart `npm run dev` after changing environment variables. For Vercel, add the same two values in the project's Environment Variables settings and redeploy. The publishable key is intended for browser use; never put the `service_role` key in browser code or a `NEXT_PUBLIC_` variable.

## Current limitation

PromptPilot's sign-in/sign-up panel uses Supabase Auth, but projects still save in browser localStorage until database operations are implemented. Creating accounts does not currently enable project sync.
