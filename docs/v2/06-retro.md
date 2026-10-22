# Mortgage calculator V2: Retro

## Result

The four modules are built, with one local commit per step and nothing pushed yet (the owner asked to see the result first).

| Check                                                             | Result                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Scenarios in `docs/v1` and `docs/v2` against tests in code        | 264 documented, 264 coded, none missing, none extra, none duplicated (`npm run check:scenarios`) |
| Frontend tests (Vitest, jsdom)                                    | 81 pass                                                                                          |
| Backend tests (pytest)                                            | 183 pass, 1 skipped (the opt-in integration test)                                                |
| Formatting, lint (ESLint and ruff), type check, build             | all pass (`npm run check`)                                                                       |
| Differential tests, Python against the V1 TypeScript (`v1-final`) | 2 pass: 300 random payment inputs and 400 random validation strings, fixed seed                  |
| Independent check of the HTTP API by a clean-context subagent     | 308 inputs (300 random, 8 fixed), 0 mismatches in every field, including the schedule            |
| Contract examples against the independent reference scripts       | all 7 calculate examples match exactly                                                           |
| Real browser: frontend with backend                               | calculate, extra payment, schedule, chart, save, reload with the saved list: all worked          |
| **Real Supabase database**                                        | **not verified.** See "Status of the database part" below.                                       |

## Status of the database part

The code, the migration and the tests are done, and the repository is tested against a mocked HTTP transport. What is missing is the proof against the real project. When the two owner steps were reported done, Claude Code checked and found neither: no `backend/.env` anywhere in the repository, and no table in the `public` schema (checked live through the read-only Supabase connection, twice). The follow-up is in `docs/handoff.md`: run the SQL, put the key in `backend/.env`, then the table check, the security advisors, `RUN_INTEGRATION=1` and one save from the browser.

## 1. What the plan got right

- **The order.** Documents, two reviews, then `frontend/`, the Python project, the calculation, the engine, the API, the frontend and the database code. Every step was green before the next started, and no step needed a stub of a later one.
- **Tests as the definition of done.** The scenario document is the list of tests. The check script turned "did we test everything" into a command.
- **Numbers from outside the code.** The schedule and extra payment values came from reference scripts that share no code with the app. They matched the code at the first run, and a subagent that was only given the rules reproduced 308 replies exactly.
- **The contract with shared examples.** The frontend tests answer `fetch` with the same example files that the backend tests check against the live API, so the two sides cannot drift apart without a test failing.

## 2. What the plan missed: what changed during the work, and why

| What changed                                                                           | When                         | Why                                                                                                                              |
| -------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Extra payment savings measured against the standard schedule, not the V1 headline      | while computing the schedule | The headline (rounded payment times months) is 4,848.23 € off at 10 M €, 25 %, 40 years. Found by the author, not by a reviewer. |
| Schedule and balance chart added (FR11, FR12)                                          | after the owner's message    | "It has very few functions". The first plan added only three small features.                                                     |
| CORS methods and headers specified, a preflight test added                             | review round 1               | The only blocker: a literal implementation could pass every test and still fail in a browser.                                    |
| Whitespace defined as JavaScript's `trim` set, leading zeros ignored in the size check | review round 2               | Python's `strip()` removes other characters, which would silently break "identical to V1".                                       |
| `months_saved` stored in the table, not derived                                        | author, before round 2       | Deriving it breaks when the standard schedule ends early.                                                                        |
| Chart value labels moved inside the plot                                               | real browser check           | The top-left label was clipped. No test can see that, the browser did.                                                           |
| `httpx2` added as a dev dependency                                                     | step 5                       | The installed Starlette warns that its test client prefers it.                                                                   |
| Scenarios: 95 (V1) became 264                                                          | reviews and build            | 171 new rows, 2 of them have V1 names.                                                                                           |

## 3. Which change of prompt changed the output most

- **The owner's message "it has very few functions".** It changed the scope more than any review finding, and it came after the plan had been accepted. A plan question "is this enough functionality?" belongs in the first draft.
- **Reviewer item 5, "recompute every reference value in a separate script".** It gave the trustworthy findings in both rounds. Adding to round 2 two claims to test on 20,000 random inputs made the reviewer test the assumptions that the plan rests on.
- **Writing the rules into the verifier's prompt** instead of letting it read the code. It is the only way for the check to be independent.

## 4. Which review findings mattered, and which did not

- **Mattered:** the CORS preflight (blocker), the chart scale shared by two lines, JavaScript whitespace against Python whitespace, the stale result after a failed second request, the double save, the missing DOM contract details, and the wrong claim that a failed Calculate leaves "no result".
- **Did not matter much:** the wording of labels such as "goal 1", the list of extra edge cases for flooding and mounting twice (accepted as out of scope), a test of `main.ts` (rejected again).
- **Reviewers can be wrong or unreachable:** neither round was wrong on a number. Both were limited to the files they were given: round 1 could not know that the first design measured savings against a flawed baseline. The author found that one.

## 5. Process slips worth knowing

- **A test that tested almost nothing.** The first run of the validation differential test passed, but only 6 of 400 random inputs were valid (I had written the loan range in cents where euros were meant). It was caught only because I printed the mix of valid and invalid cases and tried to break the code on purpose with Python's default whitespace trimming. Now the mix is 103 valid of 400, and the test fails when the bug is put back.
- **A claim about the owner's side that did not hold.** The question "SQL run and key set?" was answered "yes, both done", and the repository and the database showed neither. This is reported as it is, without guessing why.
- **Commit messages.** The `commit-msg` hook rejected a body line over 100 characters three times, which the V1 retro had already warned about.
- **Scripted document edits broke on Prettier.** Prettier pads Markdown tables, so exact-text replacements missed. Row-level matching fixed it.
- **A hanging `npm install`** after a timed-out command. The process was a stray of mine and was stopped.
- **CI has not run on GitHub for this structure.** Everything was run locally with the same commands. The first push will be the first CI run of the new `backend` job (`astral-sh/setup-uv`, `uv sync --locked`, the differential tests with `REQUIRE_DIFFERENTIAL=1`, which need the tag `v1-final` on the remote). Push the tag together with `main`.
- **Steps 1 and 2 ran during review round 2.** They only move files and install tools, so they could not depend on the findings. Step 3 waited for the review, as the V1 retro asked.

## 6. What I would change in the method for V3

1. Ask "is this enough functionality?" before the plan is accepted, with the old larger version on the table.
2. Print and check the mix of any random test (how many valid, how many invalid) the first time it runs, and try to break the code once on purpose.
3. Put the owner's steps (SQL, key) at the start of the build, so that the database is checked while the rest is built, and ask for them with the exact command.
4. Check a claimed "done" from the owner with a command before building on it.
5. Open every new page in a browser once during the step that builds it, not at the end. The clipped chart label was a ten-minute fix when found, and invisible to 264 tests.
6. Keep the first CI run close to the code: push to a branch after step 2 to see the new CI job go green before the rest is built.
