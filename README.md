# IC HQ

The internal operating system for **Impact Creatives** — dashboard, tasks, client CRM, inbound sales pipeline, goal board, Trello-style boards, whiteboards and a file hub, in one dark, Apple-grade tool.

**Stack:** Next.js 14 (App Router, TypeScript) · Tailwind CSS · Supabase (Auth, Postgres, Realtime, Storage) · dnd-kit · tldraw · framer-motion · lucide-react.

---

## 1. Setup — Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL editor**, run the two files in order:
   1. `supabase/migrations/0001_init.sql` — schema, RLS policies, triggers, storage bucket, realtime.
   2. `supabase/seed.sql` — demo data: 4 users, 3 clients, 8 leads, 1 board, goals & revenue. **Edit the emails at the top first** (they become the team's logins). All seeded accounts share the password `ic-hq-demo-1234` — change them in Auth → Users afterwards.
3. Copy `.env.example` to `.env.local` and paste your project's URL and anon key from **Project Settings → API**.

```bash
npm install
npm run dev
```

Sign in at `http://localhost:3000/login` with a seeded account (e.g. `rayan@impactcreatives.co` / `ic-hq-demo-1234`).

## 2. Deploy — Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add the environment variables from `.env.example` in **Project → Settings → Environment Variables**.
3. Deploy. No other configuration is needed.

## 3. Roles

| | admin (Rayan, Awais) | member (Baseer, Anas) |
|---|---|---|
| Dashboard / My Space | ✓ | ✓ |
| Add tasks for anyone | ✓ | own tasks only |
| Create / edit / archive clients | ✓ | view + tasks on assigned clients |
| Pipeline (create/move leads) | ✓ | ✓ (no delete) |
| Goals & revenue target | edit | view |
| Boards | sees all | member boards only |
| Files | delete anything | delete own uploads |

Everything is enforced twice: in the UI **and** with Postgres Row Level Security.

## 4. The rules encoded in the pipeline

- **Two-touch rule** — from *Touch 2 Sent* there is no further outreach action; the only exits are Replied, Call Booked, Converted or Dead.
- **Halal gate** — a lead cannot be created without confirming the category gate (no gambling/betting/prediction markets, no haram categories). Uncertain leads can be flagged (amber badge).
- **Follow-up engine** — leads with a follow-up date of today or earlier are highlighted amber and surfaced on the Pipeline and Dashboard.
- **Converted** — asks for the final deal value + close date and adds it to the month's revenue on the Goal Board automatically.

## 5. Conventions

- Timezone: **Asia/Karachi (PKT)** for all "today"/due-date logic.
- Currency: **USD**.
- Brand accent: change `--ic-blue` in `src/app/globals.css` — one place, applies everywhere.
- File uploads capped at **50MB** (bucket-enforced too); video masters stay in Drive.
