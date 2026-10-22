# Mortgage calculator V1: Retro

Result: V1 is built as planned, with 95 of 95 scenarios as passing tests, a clean lint, type check and build, a real-browser check, and an independent differential check (312 inputs, 0 mismatches). The plan changed once after the first code commit (the round 2 review), and the change is traceable in the history (`docs: apply round 2 review findings`, then `fix(calc)`).

## 1. What the plan got right

- **Scope.** FR1 to FR4 and "out of scope V1" never moved. Nothing outside V1 was built, and every deferred feature has a named place in `02-architecture.md`.
- **Module order.** Building `format`, then `payment`, then `validate`, then the form followed the dependency direction, and no step needed a stub of a later module.
- **Test names as acceptance criteria.** `npm run check:scenarios` shows 95 documented scenarios and 95 coded tests, with nothing missing, extra or duplicated.
- **Reference values from outside the code.** All 27 payment and total values in the plan were correct, confirmed by two independent reviewers and by the exact-fraction script. The 312-input differential check at the end found no mismatch.

## 2. What the plan missed: what changed during the work, and why

| What changed                                                        | When                         | Why                                                                                                                    |
| ------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Total interest rule (0 % gives 0.00, never below 0.00)              | review round 1, before code  | The first FR2 rule gave -0.04 € of interest for 1,000 €, 0 %, 1 year.                                                  |
| DOM contract (ids, labels, button text) added to the architecture   | review round 1, before code  | Tests written first had nothing to point at.                                                                           |
| Strict input syntax, decimals check, FR5 (editing hides the result) | review round 1, before code  | "Numeric" and "when is the result cleared" allowed two implementations.                                                |
| Half-cent ties rounded with exact `BigInt` arithmetic               | review round 2, after step 4 | The plan claimed ties cannot occur above 0 %. They do (1,000 €, 0.09 %, 1 month: exact 1000.075, float gives 1000.07). |
| 83 scenarios became 95                                              | round 1 and 2                | New rules needed named tests.                                                                                          |

Things that were my own slips during the build and are worth knowing:

- The review of round 2 was started in parallel with step 1. It finished while steps 1 to 4 were already committed, so two findings (ties above 0 %, more format and contract tests) were applied after code existed. The order was still plan first: docs commit `d1099ad`, then code fix `f8cddfa`. The better order is to wait for the review.
- My first plan-clarification commit accidentally contained the deletion of the old code (it was staged already). I caught it before pushing and split it with a soft reset.
- The commit-msg hook rejected a message with a body line over 100 characters. That is the hook doing its job.
- I wrote two wrong severity counts in my own notes and a wrong reference value (527.89 instead of 527.84). The script caught the value, a re-read of the reviewers' tables caught the counts.

## 3. Which change of prompt changed the output most

- The reviewer prompt item 5, "recompute every reference value in a separate script, do not estimate", produced the most trustworthy findings (the negative interest, the tie tests that did not discriminate, the float hazard). The open items 2 and 3 ("find ambiguities", "list missing edge cases") produced the long tail of minor findings.
- Adding "Read only these three files" and "Do not modify any file" kept the reviewer honest, but not fully clean (see E2).
- Adding "list anything the plan does not tell you" to the E4 prompt turned a yes/no understanding check into a list of five concrete gaps.
- The single biggest effect on the whole project was the shape of my own prompt: one delegating sentence from the student produced a plan that Claude had to decide on its own, and the open questions only reached the student as three multiple-choice questions. In V2 the student should write one prompt per layer.

## 4. Which findings from the review mattered, and which did not

- **Mattered:** negative interest (changed an FR rule), the DOM contract (made test-first possible for the form), the tie tests (found a real hazard, and round 2 found it also above 0 %), the exact extension-point table (the first one overstated how little would change).
- **Did not matter much:** traceability labels, the missing `main.ts` test (rejected twice: it is three lines), the note about the last payment in the UI (rejected).
- **The reviewer can be wrong:** its suggested tie value 999.90 € is below the 1,000 € minimum. Checking suggested values with the script avoided building a test for an impossible input.

## 5. Experiments

Expectations were written down before running each experiment. For E2 the author's own list is in `04-review.md`, for E4 the expectation is summarized below.

### E2: review in the same session vs a fresh context

- **Expected:** my own review would find the rule gaps (negative interest, decimals, parsing, stale result) and the independent one would add things I could not see.
- **What happened:** my own review had 8 items, all of them also found by the independent reviewer. The reviewer found 17 findings in total, including a blocker I had not seen at all (no DOM contract for the e2e tests), the non-discriminating tie test, the display-format ambiguity and the overstated extension points. Round 2 found 12 more findings, among them a false claim in my own reasoning about ties above 0 %.
- **Conclusion:** the fresh context found about twice as many things, and the blocker that mattered most for test-first work. Caveat: a subagent is clean of the author's reasoning, not of the environment. It saw the git status, and in E4 it quoted my global `CLAUDE.md` rule about deleting files.

### E4: a new session gets only `05-plan.md`

- **Expected:** it would understand the order (remove old code, then euro formatter test-first) and the definition of done, and it would say that it needs files 01 to 03 for the details.
- **What happened:** exactly that. It also listed gaps I had not expected: which remote and branch to push to, whether the tooling is installed, the handoff format, and what to do with the untracked local folders. All four were added to the plan in a small clarification.
- **Conclusion:** the plan is understandable on its own for order and done-criteria, and the gaps were about environment, not about the product.

### Not done

E1 (build without a plan for 20 minutes), E3 (a module without tests first) and E5 (two architecture prompts) were not run. E1 in particular would have given the comparison "scenarios passing without a plan vs with a plan". The earlier larger version on `archive/pink-redesign` is not that experiment, because it had its own short plan and went beyond the V1 scope.

## 6. What I would change in the method for V2

1. Start from a clean repository, as the assignment recommends, instead of a repo that already contains code and an old plan.
2. Wait for the independent review to finish before starting the build.
3. Put the DOM contract and the rounding rules into the first draft of the architecture and the spec. Both were found by the review, not by the author.
4. Ask the reviewer explicitly to search for rounding ties by script. The two tie findings came from scripts, not from reading.
5. Run the differential check (random inputs against an independent implementation) in the plan, not at the end, and keep `check:scenarios` in the step 1 checklist.
6. Write the prompts as separate, student-written prompts per layer, and record each one in `prompts.md` at the time. In this run `prompts.md` records one delegating prompt and the questions asked, which is honest but thin.
