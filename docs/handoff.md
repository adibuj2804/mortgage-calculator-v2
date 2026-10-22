# Handoff

## Done

- **V1** (the first version, one page in the browser): `docs/v1/`, tag `v1-final`. Not edited.
- **V2 documents:** `docs/v2/01` to `06` and `prompts.md`, two independent review rounds, reference scripts.
- **V2 build**, one local commit per step, in this order: `frontend/` move, Python project, payment and validation
  port with two differential tests, repayment schedule and extra payment, API contract and endpoints, frontend
  switch (client, schedule table, balance chart, saving, saved list), Supabase repository and migration file,
  documentation.
- **Checks:** `npm run check` passes. 264 scenarios documented, 264 coded. Frontend 81 tests, backend 183 tests
  (1 opt-in integration test skipped). An independent subagent compared 308 API replies with 0 mismatches.
- **Real browser:** frontend plus backend worked (calculate, extra payment, schedule, chart, save, saved list after reload).

## Next

1. **Database (needs the owner).** In the Supabase SQL editor run `supabase/migrations/20261022000000_create_calculations.sql`.
   Put the secret key into `backend/.env` (`cp backend/.env.example backend/.env`, never paste the key in chat).
   Then Claude Code checks: `list_tables`, security advisors, `RUN_INTEGRATION=1 npm run test:backend`, one save from the browser.
   At the last check neither the file nor the table existed.
2. **Push.** Nothing is pushed yet (the owner wanted to see the result first). Push `main` and the tag `v1-final`
   together: the backend CI job runs the differential tests, which read that tag. The first CI run of the new
   `backend` job happens then.
3. The owner reads `docs/v2/`. The content must be theirs.

## Open questions

- Is the database step still wanted for the first push, or push first and add Supabase after? The calculator works
  without it (saving and the saved list then say they are unavailable).
