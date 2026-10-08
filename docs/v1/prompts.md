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
