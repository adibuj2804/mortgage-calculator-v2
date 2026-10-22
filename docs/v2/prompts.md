# Prompts (V2)

This file records what was asked, in which words, what came out, and what changed in the prompt. The student wrote the five prompts in section A. Everything else is written by Claude Code (the documents, the code, the tests) or by subagents that Claude Code started, with prompts that are quoted here. The student still has to read `docs/v2/` and own it.

## A. The student's prompts

### A1. The plan request

**Prompt (verbatim):**

> I want to refractor my mortgage caluclator into new structure, more stable, into 4 modules, which I need a plan for. To create a plan use this structure for the new modules I have in mind:
>
> - Frontend (JavaScript) – vstupy od používateľa a zobrazenie výsledku; volá API.
> - API – dohoda medzi frontendom a backendom: aký vstup, aký výstup.
> - Backend (Python) – výpočty: splátka, mimoriadna splátka, neskôr ďalšia logika.
> - Supabase – databáza, do ktorej aplikácia ukladá dáta.
>
> After I review the plan, I will instruct you to do it. And I want the plan to be in english.

**Výsledok:** a draft plan with the four modules, a build order and 10 decisions for the owner (D1 to D10), written to `docs/v2/`. Nothing was built.
**Zmeny promptu:** none. The prompt already contained the structure, which made the plan easy to check.

### A2. The Supabase connection

**Prompt (verbatim):**

> okay, and also i have mcp connected to supabase, did you include in in the plan? does it work?

**Výsledok:** the answer was "only as a side note". Claude tested the connection (list tables, security advisors, a read-only query: all worked) and added section 2.5 to the plan.
**Zmeny promptu:** none.

### A3. The go-ahead

**Prompt (verbatim):**

> Okay, so now take the plan and follow the steps closely, to rebuilt the mortgage calculator according to the new structure and instructions. The functionality should stay more or less the same, the important part here is the organisation into the modules. So please do it and then push it to the git. might you have any questions, I will answer them.

**Výsledok:** the build in `docs/v2/05-plan.md`. The recommendations of the plan (D1 to D10) were accepted as they were.
**Zmeny promptu:** the later prompts A4 and A5 changed it.

### A4. Show it before pushing

**Prompt (verbatim):**

> okay, so show me the calcuator now, how complex it is and then we can push it to the git in this new organised way

**Výsledok:** the push was held back until the owner has seen the result. At that moment only the documents were written, so Claude said so, showed the working V1 and gave measured sizes. Every step is committed locally.
**Zmeny promptu:** this changed the plan (decision P1: no push before the owner has seen the result).

### A5. "It should be more complex by now"

**Prompt (verbatim):**

> but will the new one be more complex? it has very few functions, and i put a lot of time in it, so i should have been more complex by now

**Výsledok:** Claude admitted that V2 as planned added only three small features and that the larger earlier version (`archive/pink-redesign`) had more. It asked one question with three options. The owner chose "Schedule + chart". That added FR11 (yearly repayment schedule) and FR12 (balance chart) and a new calculation engine. It also exposed a flaw in the first design (see `04-review.md`, finding A1).
**Zmeny promptu:** none. This was the prompt with the biggest effect on the result.

## B. Prompts of Claude Code to subagents (verbatim)

### B1. Independent review, round 1

> You are an independent reviewer. You did not write this plan.
> Read only these five files (absolute paths): .../docs/v2/01-functional.md, .../docs/v2/02-architecture.md, .../docs/v2/03-test-scenarios.md, and, as the V1 reference that V2 builds on, .../docs/v1/01-functional.md and .../docs/v1/03-test-scenarios.md. Do not read any other file in the repository or anywhere else.
> Do not trust claims; check them.
>
> 1. Coverage: every requirement (FR6 to FR10 of V2, and the V1 requirements FR1 to FR5 that V2 keeps) has a module and a test; every test checks a real requirement.
> 2. Find ambiguous requirements or contract details that allow two implementations with different results (for example in the API contract, the DOM contract, the repository rules, the extra payment rules).
> 3. List missing edge cases and invalid inputs.
> 4. For 3 out-of-scope features, describe exactly which modules must change.
> 5. Recompute every reference value in a separate script: all extra payment values in section B of 03 and in FR6 of 01, and every number in the API example rows of section D (...). Use python3 with exact integer or Fraction arithmetic, run via Bash with `python3 -c` or a heredoc; do not create files in the repository. Do not estimate. Apply the rounding and totals rules exactly as the documents state them.
> 6. Check the architecture for contradictions between 01, 02 and 03 (names of fields, ids, messages, counts).
>    Return numbered findings as a table with severity (blocker / major / minor) and what each affects. Keep the report under 1000 words.
>    Do not modify any file.

**Výsledok:** 1 blocker (the CORS preflight), 13 major and 7 minor findings. All numbers were correct.
**Zmeny promptu:** the template of the assignment, extended with item 6 (contradictions) and the V1 documents as a second reference.

### B2. Independent review, round 2

The same prompt, with the schedule and the chart in scope (items 1, 2 and 5 mention FR6 to FR12 and sections B1 and B2), plus: "Also test the claims 'extra schedule never longer and never costs more than the standard schedule' and 'the standard schedule always ends with balance 0 within the term' on at least 20000 random valid inputs."

**Výsledok:** no blockers, 9 major, 8 minor. Both claims held on 30,000 random inputs.
**Zmeny promptu:** the two claims to test were added, because round 1 had shown that unstated claims are where the findings are.

### B3. Independent check of the HTTP numbers

**Prompt (shortened only in the list of fixed cases and the call example):**

> You are an independent verifier. You did not write this code and you must not edit any file in the repository. Do not read the repository's tests or docs. [...] Goal: check that the HTTP endpoint POST /api/v1/calculate of the backend returns exactly the numbers that the rules below define. [the rules: payment, totals, standard schedule, yearly rows, extra payment, response shape] [...] Write an exact Python implementation, generate 300 random valid inputs (seed 7) plus 8 fixed cases, compare every field of the reply, report how many were compared, how many mismatched, and every mismatch. Under 250 words.

**Výsledok:** see `06-retro.md`.
**Zmeny promptu:** the rules are written out in the prompt, so the verifier cannot copy them from the code.

## C. The one question Claude Code asked the owner

> How much functionality should V2 have, now that the structure makes it cheap to add? Options: Schedule + chart (recommended) / Keep V2 as planned / Everything from the old version.

**Answer:** Schedule + chart. A second question asked whether the SQL was run and the key was set. The answer was "Yes, both done", but Claude Code found neither on its side (no `backend/.env`, no table). See `06-retro.md`.

## D. Build

**Prompts:** none per step. The build followed `docs/v2/05-plan.md` and the project `CLAUDE.md`: tests first (the new tests were run and seen failing before the code), one commit per step.
