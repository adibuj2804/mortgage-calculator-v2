# Handoff

## Done

- Part A: `docs/v1/01` to `05` written, reviewed by an independent subagent (two rounds), plan committed before any V1 code.
- Part B: V1 built test-first in the order of `docs/v1/05-plan.md`: format, payment, validate, functional tests, form. 95 of 95 scenarios are tests (`npm run check:scenarios`).
- Review round 2 fixes: exact `BigInt` rounding of half-cent ties, 12 more scenarios.
- Step 6: real-browser check, independent differential check (312 inputs, 0 mismatches), README, `06-retro.md`, `prompts.md`.
- Old out-of-scope code is kept on branch `archive/pink-redesign`.

## Next

- The student reads `docs/v1/` and owns it (the content was drafted by Claude from one delegating prompt, see `prompts.md`).
- Lesson 5: change the architecture to Frontend (JavaScript), API, Backend (Python) and Supabase. The calculation in `src/calc/payment.ts` is pure and takes plain data, so it can move behind an API. The Supabase project exists and is restored.

## Open questions

- Teacher access: the repository is public, so the link is enough. Switch to private and add the teacher as a collaborator only if required.
