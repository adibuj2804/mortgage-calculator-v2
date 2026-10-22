# Prompts

## Step 0 – Repo structure

**Prompt:**

> Create this folder structure for a new project "Mortgage calculator":
>
> - README.md (one paragraph: project purpose, note that the plan is in docs/v1/)
> - CLAUDE.md (short project instructions: plan lives in docs/v1/, build only according to docs/v1/05-plan.md, tests before implementation, commit after each step)
> - docs/handoff.md (empty template with sections: Done, Next, Open questions)
> - docs/v1/ with empty files: 01-functional.md, 02-architecture.md, 03-test-scenarios.md, 04-review.md, 05-plan.md, 06-retro.md
> - docs/v1/prompts.md with a heading and a section "Step 0 – Repo structure"
>
> Do not write any code.

**Výsledok:** Claude vytvoril štruktúru priečinkov a prázdne súbory.
**Zmeny promptu:** žiadne.

## Step 1 – Functional definition (plan mode)

**Prompt:**

> I'm planning V1 of a mortgage calculator. Interview me about the functional scope of V1. Ask one question at a time. Push back when I add features that don't belong in V1. Every requirement must have inputs, output, rules and an example with concrete numbers. No technologies (frameworks, databases) – only what the user gets. At the end, propose the document with sections: Purpose, Functional requirements, Inputs and limits, Domain rules, Out of scope V1, Open questions.

**Výsledok:** Claude sa pýtal 7 otázok (jadro, typ úveru, výstupy, vstupy a limity, zaokrúhľovanie, ďalšie funkcie, neplatné vstupy); splátkový kalendár, poplatky a mimoriadne splátky odsunul mimo V1 a výsledok navrhol v požadovanej štruktúre.
**Zmeny promptu:** žiadne.

**Prompt na uloženie:**

> Save the approved functional definition to docs/v1/01-functional.md in the required structure.

**Výsledok:** Vznikol `01-functional.md` (4 požiadavky, limity, doménové pravidlá, mimo rozsahu V1, 4 otvorené otázky).
**Zmeny promptu:** žiadne.

## Step 1b – Delegating the rest of the homework (new session, Claude Code)

**Prompt (verbatim, the only instruction for steps 1b to 6):**

> the thing is that all of this need to be done in less than 10 minutes, there is a step by step to follower as a homework from lesson 4 and then there is a screenshot of an email for lesson 5, I need you to do alo of these, step by step, so that everything works accordingly,.....if you have any question, I cn answer and hen I will let you cook

(The prompt was sent together with 14 screenshots of the homework assignment and of the Lesson 5 e-mail.)

**Výsledok:** Claude found the repo in a mixed state: 02 to 04 and 06 were empty, `05-plan.md` was an unrelated "pink redesign" plan, and the code on `main` already had a schedule, extra payments and affordability, which `01-functional.md` declares out of scope. Claude asked 3 questions; the answers were:

- Keep `01-functional.md` as approved. The extra features were saved to branch `archive/pink-redesign` and V1 is rebuilt from the plan.
- Resolve the 4 open questions with Claude's defaults (dot decimal only, nominal rate, same limits, English UI).
- Restore the paused Supabase project for Lesson 5.

**Zmeny promptu:** žiadne. Honest note: from here on the content of 02, 03 and 05 was drafted by Claude from this one delegating prompt and the three answers above, not from separate prompts written by the student. The student reviewed it afterwards.

## Step 2 – Architecture (executed by Claude, no separate student prompt)

**Prompt (as executed):**

> Read docs/v1/01-functional.md. Propose a modular architecture. For each module give responsibility, interface and which requirements it implements. Give a direction of dependencies, a data model, an extension point for every out-of-scope feature, and decisions in the form decision, reason, alternative considered. Save to docs/v1/02-architecture.md.

**Výsledok:** see `02-architecture.md`.
**Zmeny promptu:** žiadne (prvý pokus).

## Step 3 – Test scenarios (executed by Claude, no separate student prompt)

**Prompt (as executed):**

> Read docs/v1/01-functional.md and docs/v1/02-architecture.md. Propose test scenarios in the required table (Test, Level, Module, Verifies requirement, Input, Expected output, Source of expected value, Type). Money exact to the cent. Compute every reference value independently of the app code. List edge cases the user has not mentioned.

**Výsledok:** see `03-test-scenarios.md`. Reference values come from an independent Python `Decimal` script, verified by a month-by-month balance simulation that ends at 0 for every case.
**Zmeny promptu:** žiadne (prvý pokus).
