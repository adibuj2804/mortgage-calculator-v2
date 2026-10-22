# Mortgage calculator

A mortgage calculator split into four modules. The user enters a loan amount, a yearly interest rate and a term in years (and optionally an extra monthly payment), presses "Calculate", and gets the monthly payment, the total paid and the total interest of a fixed-rate annuity loan, a yearly repayment schedule with a balance chart, and what an extra payment saves. A calculation can be saved and listed later. Everything is in euros and exact to the cent.

The project is built plan-first. The plans, the independent reviews, the test scenarios and the prompts live in [`docs/v1/`](docs/v1/) (the first version, one page in the browser) and [`docs/v2/`](docs/v2/) (this structure).

## The four modules

| Module   | Directory                | Technology           | One job                                                              |
| -------- | ------------------------ | -------------------- | -------------------------------------------------------------------- |
| Frontend | [`frontend/`](frontend/) | TypeScript, Vite     | Takes the user's input, shows the result, calls the API.             |
| API      | [`api/`](api/)           | OpenAPI file, JSON   | Fixes what goes in and what comes out between frontend and backend.  |
| Backend  | [`backend/`](backend/)   | Python 3.12, FastAPI | Does the calculations: payment, extra payment, schedule, later more. |
| Supabase | [`supabase/`](supabase/) | Postgres, SQL        | The database where the app stores its data.                          |

```
browser: frontend  --HTTP /api/v1-->  backend: web -> service -> calc
                                                     service -> repository --REST--> Supabase
both sides are tested against api/ (openapi.json and the example files)
```

## Run it

You need Node 22.18 or newer and [uv](https://docs.astral.sh/uv/) (it installs Python 3.12 for you).

```bash
npm install
cd backend && uv sync && cd ..
cp backend/.env.example backend/.env    # then edit it, see below
npm run dev
```

`npm run dev` starts the backend on <http://localhost:8000> and the frontend on <http://localhost:5173>. Open the frontend.

- **Without a database:** set `STORAGE=memory` in `backend/.env`. Saving works, but the saved list is lost when the backend restarts.
- **With Supabase:** follow [`supabase/README.md`](supabase/README.md) (create the table, put the secret key into `backend/.env`).
- **Without either:** the calculator still works. Saving and the saved list say they are unavailable.

## Checks

| Command                   | What it does                                                                      |
| ------------------------- | --------------------------------------------------------------------------------- |
| `npm run check`           | everything below, as CI does                                                      |
| `npm test`                | frontend tests (Vitest, jsdom) and backend tests (pytest)                         |
| `npm run check:scenarios` | every scenario in `docs/v1` and `docs/v2` is a test, and every test is a scenario |
| `npm run lint`            | ESLint (frontend, scripts). `npm run lint:backend` runs ruff                      |
| `npm run typecheck`       | TypeScript, strict                                                                |
| `npm run build`           | type check and production build of the frontend                                   |

The backend integration test talks to a real Supabase project and is opt-in: `RUN_INTEGRATION=1 npm run test:backend`.

## How it is built

```
frontend/src/   api/ (client, types)  format/  ui/ (form, chart, schedule table)  identity.ts  main.ts
backend/app/    calc/ (payment, validate, schedule, extra)  service.py  repository.py
                supabase_repository.py  web/ (routes, models)  config.py  main.py
api/            openapi.json  examples/*.json
supabase/       migrations/*.sql  README.md
docs/           handoff.md  v1/  v2/
```

The numbers in the tests do not come from the code. `docs/v1/reference-values.py`, `docs/v2/reference-extra.py` and `docs/v2/reference-schedule.py` compute them with exact integer arithmetic, and two differential tests compare the Python rules with the first version's TypeScript (git tag `v1-final`).

## Good to know

- The saved list belongs to a random id that the browser keeps. It is not a login: anyone who knows an id can ask for that list. There are no accounts.
- The Supabase secret key lives only in `backend/.env` (ignored by git). The browser never talks to Supabase.
- The headline total of the first version (payment times months) can differ from the repayment schedule, by a few cents for typical loans and by more at extreme rates. The schedule shows the real figures. See FR11 in `docs/v2/01-functional.md`.

## Branches and tags

- `main`: the current structure, built from `docs/v2/05-plan.md`.
- `v1-final` (tag): the last commit of the first version.
- `archive/pink-redesign`: an earlier, larger version, kept for reference.
