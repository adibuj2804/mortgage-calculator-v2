# AGENTS.md

Guide for AI coding agents (and humans) working in this repo. Read this first.

## What this is

Single-page mortgage calculator, Slovak UI (`sk-SK`, EUR). Inputs: price, down payment (€ and %
kept in sync), annual rate, term in years. Outputs: monthly annuity payment, total paid, total
interest, overpayment %, principal/interest donut. No backend, no framework.

Stack: Vite 8 · TypeScript (strict) · Vitest · ESLint · Prettier · Husky. Node 20+.

## Commands

```bash
npm install
npm run dev          # dev server on :5173
npm test             # unit tests (run before every commit)
npm run lint && npm run typecheck && npm run format:check
npm run build        # typecheck + production build to dist/
```

Definition of done: `lint`, `typecheck`, `test` and `build` all pass.

## Layout

| Path                   | Role                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `src/calc/mortgage.ts` | Pure maths: `calculateLoan`, `downPaymentFromPct`, `downPaymentPctFromAmount`. **No DOM.** |
| `src/calc/*.test.ts`   | Vitest tests, colocated with the code                                                      |
| `src/ui/`              | DOM access (`dom.ts`), donut SVG (`donut.ts`), result/error rendering (`results.ts`)       |
| `src/format.ts`        | `sk-SK` currency/number formatting                                                         |
| `src/main.ts`          | Wiring only: read inputs → `calculateLoan` → render                                        |
| `src/styles/main.css`  | All CSS; light/dark via CSS variables                                                      |
| `index.html`           | Static markup; element IDs are used by `src/ui` and `main.ts`                              |
| `legacy/`              | v1 single-file app. Reference only, **do not edit**                                        |

Data flow: `main.ts` → `calculateLoan(LoanInput)` → `LoanOutcome` (`{ok:true,result}` or
`{ok:false,error}`) → `ui/results.ts`. Validation errors are typed codes mapped to Slovak messages
in `ui/results.ts`; `calc/` never returns user-facing text.

## Conventions

- Business logic goes in `src/calc/` as pure functions with tests; keep `src/ui/` thin.
- TypeScript strict + `noUncheckedIndexedAccess`; avoid `any` and non-null assertions.
- UI strings are Slovak. Keep them in `index.html` or `ui/results.ts`, not in `calc/`.
- If you rename or remove an element ID in `index.html`, update every `byId(...)` use.
- Style: Prettier (single quotes, width 100). Hooks format staged files automatically.
- Add a test for any change to calculation behaviour.

## Git workflow

- Never commit to `main` directly. Branch: `feat/…`, `fix/…`, `docs/…`, `refactor/…`, `chore/…`.
- Commits: Conventional Commits (`feat(calc): …`), enforced by a `commit-msg` hook. Subject and
  body lines ≤ 100 chars. Scopes: `calc`, `ui`, `deps`.
- Update `CHANGELOG.md` under **Unreleased** for user-visible changes.
- Releases: annotated tag `vX.Y.Z` on `main`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Gotchas

- Husky hooks run on commit; if one fails, fix the cause and make a new commit. Don't use
  `--no-verify`.
- `.mcp.json` points at a Supabase project in read-only mode and expects `SUPABASE_ACCESS_TOKEN`
  in the environment. The app does not use Supabase yet. Never commit secrets (`.env*` is ignored).
- Fonts load from Google Fonts at runtime (see `index.html`).
