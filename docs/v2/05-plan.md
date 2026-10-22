# Mortgage calculator V2: Plan

This is the plan for the build. It says what to build, in which order, and when it is done. The details are in `01-functional.md` (what), `02-architecture.md` (modules, the API contract, the DOM contract, the data model), `03-test-scenarios.md` (the tests, by name) and `04-review.md` (the independent review). `docs/v1/` stays as it is.

## 1. What V2 is

V1 is one TypeScript page that validates, calculates and formats in the browser and stores nothing. V2 splits it into four modules with one job each:

| Module       | Technology            | One job                                                                      |
| ------------ | --------------------- | ---------------------------------------------------------------------------- |
| **Frontend** | TypeScript (Vite)     | Takes the user's input, shows the result, calls the API.                     |
| **API**      | OpenAPI contract      | Fixes what goes in and what comes out between the frontend and the backend.  |
| **Backend**  | Python 3.12 (FastAPI) | Does the calculations: monthly payment, extra payment, schedule, later more. |
| **Supabase** | Postgres (hosted)     | The database where the app stores its data.                                  |

The point of the refactoring is the organisation. The functionality stays the same, plus: an extra monthly payment, a yearly repayment schedule with a balance chart, saving a calculation, and a list of saved calculations.

## 2. Decisions

The owner accepted the recommendations of the first draft ("follow the plan") and chose the larger scope. The decisions are recorded in `01-functional.md` and `02-architecture.md`. What changed compared with the first draft:

| #   | Decision                                                                                                           | Why                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| S1  | V2 scope: restructure, extra payment, save and saved list **plus** a yearly repayment schedule and a balance chart | The owner asked for more functionality. The new structure makes it cheap, and the schedule is built in the backend. |
| D5  | Extra payment savings are measured against the **standard schedule**, not the V1 headline                          | The headline can be 4,848.23 € off at 10 M €, 25 %, 40 years. One loop serves the schedule and the savings.         |
| P1  | **Nothing is pushed until the owner has seen the result.** Every step is committed locally.                        | The owner asked to see the calculator first. This replaces the first draft's "push after every step".               |
| P2  | The Supabase client is the REST interface with `httpx`, the HTTP package is `web/`, npm workspaces are used        | Fewer dependencies, and no package named like a standard library module.                                            |
| P3  | The database part (step 6) is finished after the frontend (step 7), because it needs the owner's SQL run and key   | The backend works with the in-memory repository until then, so nothing waits.                                       |

## 3. Goals

Each goal is a yes or no at the end.

1. **Behaviour preserved.** All 95 V1 scenarios exist in the new structure and pass. The Python calculation and validation match the V1 TypeScript on random inputs (two differential tests, fixed seed, 0 mismatches).
2. **Four modules, one direction.** `frontend` calls `api` only over HTTP, `backend` implements `api`, and uses `supabase` through one interface (`02-architecture.md`, dependency rules).
3. **Stable.** The calculator works when Supabase is unreachable. Only saving and the saved list show an error.
4. **New features.** Extra payment, yearly schedule, balance chart, save, saved list (FR6 to FR12).
5. **Every scenario is a test.** Every scenario of `03-test-scenarios.md` and of `docs/v1/03-test-scenarios.md` exists as a passing test, with no extra and no duplicate (`npm run check:scenarios`).
6. **Green every step.** Lint, type checks, tests and the build pass after every commit, and CI would be green.

## 4. Acceptance criteria

### Functional: tests that must pass

Test names are exactly the names in `03-test-scenarios.md` and `docs/v1/03-test-scenarios.md`. Counts are fixed when step 0 is closed.

| Group                                          | Where                                 | Scenarios |
| ---------------------------------------------- | ------------------------------------- | --------- |
| V1 payment, totals, contract (A)               | `backend/tests/calc/test_payment.py`  | 35        |
| V1 validation (A) and new validation (C)       | `backend/tests/calc/test_validate.py` | 33 + 20   |
| Schedule (B1) and extra payment (B2)           | `backend/tests/calc/`                 | 10 + 12   |
| HTTP layer and contract (D), V1 `functional-*` | `backend/tests/web/`                  | 50        |
| Repository and configuration (E)               | `backend/tests/repository/`           | 19        |
| Differential tests (F)                         | `backend/tests/differential/`         | 2         |
| V1 format (A) and new frontend tests (G)       | `frontend/src/`                       | 12 + 55   |
| V1 end to end (A)                              | `frontend/src/ui/form.test.ts`        | 13        |
| Architecture rules (H)                         | `backend/tests/`, `frontend/src/`     | 3         |

### Technical

- `npm test` runs the frontend and the backend suites and passes with no failing and no skipped test (the integration test is opt-in and is the only exception).
- `npm run check` passes: formatting, lint for both languages, type check, tests, build and the scenario check.
- `npm run dev` starts the backend and the frontend, and the README says how.
- The calculator works with `STORAGE=supabase` and no key (database unavailable), and with `STORAGE=memory`.
- `get_advisors` (Supabase, security) shows no warning for `calculations` (the informational notice "RLS enabled, no policy" is intended), and the public key reads nothing from it.
- No secret in the git history or the working tree.

## 5. Build order

Every step: write the tests first and see them fail, then the code, then one local commit. The order follows the dependencies, so no step needs a stub of a later one.

| Step | What                                                                                                                                                                                                    | Must pass at the end                                                   | Commit                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| 0    | Documents `01` to `04` (the review), reference scripts, this plan. Two independent review rounds. `v1-final` tag on the last V1 commit.                                                                 | the documents are consistent, every review finding has a decision      | `docs: add V2 functional spec, architecture and test scenarios` |
| 1    | Move the web app into `frontend/`, root `package.json` with a workspace, `CLAUDE.md` points to `docs/v2/`.                                                                                              | 95 V1 tests, lint, typecheck, build pass from the new place            | `refactor: move the web app into frontend/`                     |
| 2    | Python project: uv, Python 3.12, pytest, ruff, a CI job, root scripts for both sides.                                                                                                                   | an environment test passes, ruff passes                                | `build(backend): add Python project and CI job`                 |
| 3    | Backend `calc/payment.py` and `calc/validate.py`: the 68 V1 scenarios and the new validation scenarios, plus the two differential tests.                                                                | those scenarios and 0 mismatches against the V1 TypeScript             | `feat(backend): port the payment and validation rules`          |
| 4    | Backend `calc/schedule.py` and `calc/extra.py`: schedule and extra payment scenarios. Reference values from the scripts, independent recompute.                                                         | the B1 and B2 scenarios, a clean-context recompute with 0 mismatches   | `feat(backend): add repayment schedule and extra payment`       |
| 5    | `service`, `repository` (interface, in-memory, unavailable), `web` and the contract: `/health`, `/calculate`, `/calculations` with the in-memory repository, `api/openapi.json`, `api/examples/`, CORS. | the D and the in-memory E scenarios, the drift check                   | `feat(api): add the endpoints and the contract`                 |
| 6    | Frontend switch: API client, identity, format and chart modules, the new form, schedule table, chart, saved list.                                                                                       | the G scenarios, the 13 V1 end to end scenarios on the fake `fetch`    | `feat(frontend): use the API`                                   |
| 7    | Supabase: migration file, the repository over REST, configuration. The owner runs the SQL and sets the key, then the MCP checks and the opt-in integration test.                                        | the remaining E scenarios, advisors without warnings, integration test | `feat(supabase): store and list calculations`                   |
| 8    | Whole system check: run both servers, real-browser check, the differential check by a clean-context subagent, secrets search, `npm run check`.                                                          | everything in section 4                                                | `docs: finish V2 verification`                                  |
| 9    | Docs: README, `AGENTS.md`, `CONTRIBUTING.md`, `supabase/README.md`, `06-retro.md`, `prompts.md`, `docs/handoff.md`. Nothing is pushed before the owner has seen the result.                             | docs match the code, `check:scenarios` clean                           | `docs: add V2 README and retro`                                 |

(The numbering of steps 6 and 7 differs from the first draft: the frontend is built before the Supabase repository, see P3. Step 7 is the first step that needs the owner.)

## 6. Definition of done

**Per step:** the step's tests are green, all earlier tests are still green, formatting, lint and type checks pass, one local commit, and `docs/handoff.md` is updated at the end of the work.

**V2 is done when:**

- [ ] All 95 V1 scenarios pass in their new place, and both differential tests show 0 mismatches.
- [ ] Every scenario is a test, none is extra (`npm run check:scenarios`).
- [ ] The repayment schedule and the balance chart show the numbers of FR11 and FR12 in a real browser.
- [ ] The calculator works with the database unreachable, and saving shows a clear error.
- [ ] A saved calculation is still in the list after reloading the page (with the real Supabase).
- [ ] No secret in the history or the tree (searched).
- [ ] The owner has seen the result, and then it is pushed.

## 7. Tools used during the build

- **Husky and commitlint** (already set up): block a commit that breaks formatting, lint or the message rules. `lint-staged` also runs ruff on Python files.
- **uv and Python 3.12** in the user folder. Nothing system-wide changes.
- **Subagents with a clean context:** the document reviews (done, two rounds) and the independent recompute of the schedule and extra payment values in step 4 and the end check in step 8.
- **Supabase MCP (read-only):** only to check the table and the advisors after the migration.
- **Real browser pane:** the final check of the page.

## 8. Risks

| Risk                                                                 | What we do                                                                                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| The Python port rounds differently from V1                           | The V1 reference script, the ported scenarios and the two differential tests against the real V1 TypeScript.                               |
| The schedule and the headline differ (can be large at extreme rates) | Documented in FR11. The headline is not changed, the schedule shows the real figures.                                                      |
| The frontend and the backend drift apart                             | Shared example files, a committed `openapi.json` with a drift test, and frontend tests that use the same examples.                         |
| A secret ends up in git                                              | `backend/.env` is ignored. Only `.env.example` is committed. The history is searched before the push. The owner types the key into `.env`. |
| Saved data is readable by anyone who knows a client id               | Documented in FR8 and the README. Accounts are a later step.                                                                               |
| A step is red in CI (this happened in V1)                            | Every step keeps the build green, and the CI file changes in the same commit as the code it checks.                                        |
| The chart code is the largest untested-by-eye part                   | The numbers are tested through `data-balances`. The look is checked once in a real browser.                                                |
| Free Supabase projects pause after a week of no use                  | Health shows `database: unavailable` and the calculator keeps working. The README says how to restore.                                     |

## 9. What I need from the owner

1. At step 7: run one SQL file in the Supabase SQL editor, and put the **secret key** into `backend/.env` yourself. Never paste it in chat.
2. At the end: look at the result. Then I push (and CI runs on GitHub for the first time with the backend job).
3. Read `docs/v2/`. The content must be yours.
