# Backup Dashboard

Next.js + Supabase dashboard for managing integrations and business data. Auth uses Supabase with a dedicated `auth_users` table for user profiles (name, initials, business name) with RLS policies.

## Tech Stack
- Next.js (App Router)
- TypeScript
- Supabase (Auth + Postgres)
- TailwindCSS / shadcn/ui

## Local Development
1) Install dependencies
```bash
npm install
```

2) Run dev server
```bash
npm run dev
```
App runs at http://localhost:3000

## Environment Variables
Create a `.env.local` file with your Supabase config:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
Note: `.env*` is already ignored by `.gitignore`.

## Database
- `supabase/migrations/` contains SQL for `auth_users` table, RLS policies, and trigger to insert on new auth user creation.

## Scripts
- `npm run dev`: start development
- `npm run build`: production build
- `npm run start`: start production server

## Notes
- Sidebar and Dashboard read user data from `auth_users` instead of immutable auth metadata.
- Keep secrets out of git. Ensure `.env.local` is present locally and not committed.
