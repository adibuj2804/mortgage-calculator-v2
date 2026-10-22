# Supabase

The database of the mortgage calculator: one table, `public.calculations`, that stores saved calculations (the inputs, the result, the extra payment result, a creation time and the random id of the browser). No names, no e-mail, no addresses.

The backend is the only part that talks to Supabase, over its REST interface, with the **secret key**. The browser never does.

## One-time setup

1. **Create the table.** Open your project in the [Supabase dashboard](https://supabase.com/dashboard), go to **SQL Editor**, paste the whole content of [`migrations/20261022000000_create_calculations.sql`](migrations/20261022000000_create_calculations.sql) and click **Run**.
2. **Copy the secret key.** In the dashboard open **Project Settings, API Keys** and copy the **secret** key (it starts with `sb_secret_`). Do not use the publishable key, and never paste the secret key into a chat or a commit.
3. **Put it into `backend/.env`.** Copy `backend/.env.example` to `backend/.env` and set `SUPABASE_SECRET_KEY=` to the key. `SUPABASE_URL` is already filled in with this project's address.
4. Start the app with `npm run dev`. `http://localhost:8000/api/v1/health` should answer `"database": "ok"`.

## Security

- Row level security is on and there are no policies, so the public (anon) key can read and write nothing in this table. Only the backend, with the secret key, can.
- The Supabase advisor may show an informational notice "RLS enabled, no policy" for this table. That is intended.
- A free Supabase project pauses after a week without use. Restore it in the dashboard, or ask Claude Code to restore it with the Supabase connection. While it is paused, `health` shows `"database": "unavailable"` and the calculator keeps working.

## Checking the table

The Supabase connection of this repository (`.mcp.json`) is read-only and is used only to check things: that the table exists and that the security advisors have no warning. It does not change the database.
