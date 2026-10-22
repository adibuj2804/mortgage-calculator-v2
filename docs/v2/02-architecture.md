# Mortgage calculator V2: Architecture

Everything here serves FR1 to FR12 (`docs/v1/01-functional.md` for FR1 to FR5, `01-functional.md` for FR6 to FR12). The longer reasoning, the build order and the risks are in `05-plan.md`.

## Starting point

V1 is on `main` at tag `v1-final`: one TypeScript page (`src/`) that validates, calculates and formats in the browser. V2 moves the page into `frontend/`, moves the calculation and validation to a Python backend, adds a contract between them and a Supabase table. The numbers of FR1 and FR2 must not change.

## The four modules

| Module   | Directory   | Technology           | One job                                                                            |
| -------- | ----------- | -------------------- | ---------------------------------------------------------------------------------- |
| Frontend | `frontend/` | TypeScript, Vite     | Takes the user's input, shows the result, calls the API.                           |
| API      | `api/`      | OpenAPI file, JSON   | Fixes what goes in and what comes out between frontend and backend.                |
| Backend  | `backend/`  | Python 3.12, FastAPI | Does the calculations: monthly payment, extra payment, schedule, later more logic. |
| Supabase | `supabase/` | Postgres, SQL        | The database where the app stores its data.                                        |

### Dependency rules

- `frontend` imports nothing from `backend`. It knows the API only through the contract in `api/`.
- The browser never talks to Supabase. The Supabase key exists only in the backend.
- Inside `backend`: `web` calls `service`, `service` calls `calc` and the `repository` interface. `calc` imports nothing from the other layers and does no input or output. The Supabase code is one implementation of `repository`.
- `web` holds the rules of the HTTP layer only: the shape of the request body, the `client_id` and `limit` parameters, the status codes and the 422 body. It holds no calculation or validation rules of the calculator. Those are in `calc`.
- `api/` and `supabase/` contain only data (JSON, SQL). They import nothing.
- No circular dependencies.

```
frontend/  --HTTP /api/v1-->  backend/web -> service -> calc (validate, payment, schedule, extra)
                                              service -> repository (interface)
                                                            ^ implemented by supabase_repository --REST--> Supabase
both sides are tested against api/ (openapi.json + examples/)
```

## Module 1: Frontend (`frontend/src/`)

| File                  | Responsibility                                 | Interface                                                                                                   |
| --------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `api/client.ts`       | The only code that calls `fetch`.              | `createApiClient(baseUrl, fetchFn?, timeoutMs?)` returns `{ calculate, save, list }`                        |
| `identity.ts`         | Creates and remembers the random client id.    | `getClientId(storage?): string`                                                                             |
| `format/euro.ts`      | Turns amounts into the text shown to the user. | `formatEuro(euros): string`, `formatCents(cents): string`                                                   |
| `format/saved.ts`     | Writes one saved item as the text of FR8.      | `formatSavedItem(item): string`                                                                             |
| `ui/form.ts`          | Connects the page to the API client.           | `mountCalculator(root, api, clientId): void`                                                                |
| `ui/scheduleTable.ts` | Fills the schedule table.                      | `renderSchedule(tbody, totalRow, schedule): void`                                                           |
| `ui/chart.ts`         | Draws the balance chart as SVG.                | `chartPoints(balances, { width, height, points, max }): string`, `renderChart(svg, standard, extra?): void` |
| `main.ts`             | Starts the app.                                | reads `VITE_API_URL` (default `http://localhost:8000`)                                                      |

**API client.** Types follow the contract below: `CalculateRequest`, `CalculateResponse`, `SavedCalculation`. `calculate(request)` resolves with `CalculateResponse`, `save(request, clientId)` with `SavedCalculation`, `list(clientId, limit)` with `SavedCalculation[]`. A request that takes longer than `timeoutMs` (default 10000, so 10 seconds) is aborted. There are three failure classes:

- `ApiValidationError` (HTTP 422, has `errors`, a map from field name to message),
- `ApiUnavailableError` (HTTP 503),
- `ApiUnreachableError` (network failure, timeout, a reply that is not JSON or does not have the shape of the contract, any other HTTP status, and a 422 whose keys are not among the four field names).

The four field names map to the V1 ids as `loan` to `#loan`, `annual_rate_percent` to `#rate`, `term_years` to `#years`, `extra_monthly_payment` to `#extra`, and the error slots are `#loan-error`, `#rate-error`, `#years-error`, `#extra-error`. A 422 with `_request`, `client_id` or any unknown key means the page sent something it should not have, so it is treated as unreachable.

**What the frontend no longer does:** calculate or validate. `calc/payment.ts` and `calc/validate.ts` of V1 are removed.

**DOM contract.** All V1 ids, labels and texts stay (`docs/v1/02-architecture.md`, module 4). New elements:

| Element             | Contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| extra field         | `<label for="extra">Extra monthly payment (€, optional)</label>`, `<input id="extra" type="text" inputmode="decimal">`, error slot `<p id="extra-error" role="alert">`. The request field `extra_monthly_payment` carries its text.                                                                                                                                                                                                                                                                                                                                                                                                                |
| calculate button    | while a calculation request runs it has `disabled` and the text `Calculating…`, and goes back to `Calculate` when that request ends                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| unreachable message | `<p id="calc-error" role="alert">`, text `Can't reach the calculator. Try again.` or empty. Empty at the start of every submit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| extra result block  | `<div id="extra-result">` with the `hidden` attribute unless an extra payment result exists, containing `<dd id="result-payoff">`, `<dd id="result-months-saved">`, `<dd id="result-extra-interest">`, `<dd id="result-interest-saved">` with the labels `Loan ends after`, `Months saved`, `Interest with extra payments`, `Interest saved`. Month texts are `161 months` or `1 month`, amounts come from `formatCents`.                                                                                                                                                                                                                          |
| schedule            | `<section id="schedule">` inside `#result`, with `<table id="schedule-table">`: head `Year`, `Paid`, `Interest`, `Principal`, `Balance`; `<tbody id="schedule-body">` with one `<tr>` per year (cells are the year number and four `formatCents` texts); `<tfoot><tr id="schedule-total">` with `Total`, the total paid, the total interest, and empty cells; `<p id="schedule-note">` with the note text of FR11                                                                                                                                                                                                                                  |
| chart               | `<svg id="balance-chart" viewBox="0 0 640 260" role="img" aria-labelledby="balance-chart-title">` inside `#schedule`, with `<title id="balance-chart-title">Remaining balance by year</title>`, `<g transform="translate(70,10)">` that holds the lines, `<polyline class="line line--standard" data-balances="c0,c1,..." points="...">`, a second `<polyline class="line line--extra" data-balances="..." points="...">` only with an extra payment result, and `<text class="axis">` labels `Year 0`, `Year N`, the loan amount (`formatCents`) and `0.00 €`. `data-balances` is the list of balances in cents, comma separated, with no spaces. |
| save                | `<button type="button" id="save-button">Save this calculation</button>` inside `#result`, and `<p id="save-status" role="status">` with `Saved.`, the failure message, or empty. While a save runs the button has `disabled` and the text `Saving…`. After a successful save it has `disabled` and the text `Saved` until a new result is shown. After a failure it is enabled again.                                                                                                                                                                                                                                                              |
| saved list          | `<section id="saved">` with `<ul id="saved-list">` and `<p id="saved-message" role="status">` with `Nothing saved yet.`, `Saved calculations are unavailable right now.`, or empty. Each `<li>` has the text of FR8.                                                                                                                                                                                                                                                                                                                                                                                                                               |

**Behaviour.**

- V1 behaviour stays: nothing is calculated until submit, messages stay until the next submit, Enter submits.
- The chart plot box is 520 wide and 200 high (inside the translated group). Both lines use the same scale: x = index ÷ (points − 1) × 520, where `points` is the number of points of the standard line, so a shorter extra line ends before the right edge. y = (1 − balance ÷ max) × 200, where `max` is the first balance of the standard line (the loan). Coordinates are rounded to 2 decimals with trailing zeros removed. For the 100,000 € example the standard line runs from `0,0` to `520,200` and the extra line (15 points) ends at `364,200`.
- When a calculation request starts, the previous result is hidden.
- A request counter is increased on every submit and on every edit of any of the four fields. A calculation reply is used only if the counter is unchanged. An edit hides `#result` (and with it the schedule, the chart and the save button), and clears `#save-status`.
- A second submit while a calculation request runs is ignored. The calculate button is enabled again when the running request ends, even if its reply is ignored.
- Saving sends the typed values of the calculation on screen and the client id. A save reply never changes `#save-status` if the counter changed since the save started, but the saved list is refreshed after any successful save.
- The saved list is loaded on mount (with `limit=20`) and after a successful save. Only the newest list request is applied. A failed list or save request (any failure class) shows its fixed message and nothing else.
- The client id is stored in `localStorage` under the key `mortgage.clientId`. A stored value that is not a canonical UUID is replaced by a new id. A late 422 or failure reply after an edit is ignored like a late success. Only the newest list request is applied.
- `crypto.randomUUID` is used when it exists. Otherwise the id is built from `crypto.getRandomValues` as a version 4 UUID.

## Module 2: API (`api/`)

The contract is `api/openapi.json` (generated from the backend with `backend/scripts/export_openapi.py`, committed, and checked for drift in the backend tests) plus `api/examples/*.json`. Each example file is `{ "name", "setup", "request": { "method", "path", "body" }, "status", "response" }`. `setup` is `{}` or describes the repository state the example needs (`"repository": "unavailable"`, or `"saved": [ request bodies ]`). Backend tests assert that the live response to every example request equals the example. Frontend tests answer `fetch` with these same files.

Base path `/api/v1`. JSON. Field names in `snake_case`. Money in whole cents. A breaking change gets `/api/v2`. Only the paths and methods below exist: any other path answers 404 and a wrong method 405 (framework default bodies, not part of the contract). A trailing slash is not supported and does not redirect (`redirect_slashes` is off), it answers 404. The committed `openapi.json` is generated by the code and compared with it in a test, so it is regenerated whenever the dependencies change.

| Endpoint                                     | Purpose                                             | Success                  | Errors       |
| -------------------------------------------- | --------------------------------------------------- | ------------------------ | ------------ |
| `GET /api/v1/health`                         | Is the service up, is the database reachable?       | `200 {status, database}` | none         |
| `POST /api/v1/calculate`                     | Validate and calculate. No database.                | `200` calculate response | `422`        |
| `POST /api/v1/calculations`                  | Validate, calculate again on the server, save.      | `201` saved calculation  | `422`, `503` |
| `GET /api/v1/calculations?client_id=&limit=` | List one client's saved calculations, newest first. | `200 {items}`            | `422`, `503` |

- **Request body** of both `POST` endpoints: `{ "loan": string, "annual_rate_percent": string, "term_years": string, "extra_monthly_payment": string }`. All values are the text as typed. The body is parsed as JSON whatever the `Content-Type` is. A body that is empty, not JSON, not a JSON object, or larger than 10,000 bytes is a `_request` error. `NaN` and `Infinity` literals are accepted by the parser and are not strings, so they give `Enter a number`. If a key is repeated the last one wins. Fields the client should not send (`input`, `result`, `id`, `created_at`) are ignored. Required fields that are missing or `null` count as empty text (`Enter a number`). `extra_monthly_payment` missing or `null` means no extra payment. Any value that is not a string (a number, a boolean, a list, an object) gets `Enter a number` on its field. Unknown fields are ignored. `POST /calculations` also needs `"client_id"`.
- **Calculation** (the base of the calculate response and of a saved item):
  `{ "input": { "loan_cents", "annual_rate_hundredths", "term_months", "extra_monthly_cents" }, "result": { "monthly_payment_cents", "total_paid_cents", "total_interest_cents" }, "extra_payment": null | { "months_to_payoff", "months_saved", "total_interest_cents", "interest_saved_cents" } }`
- **Calculate response:** the calculation plus `"schedule": { "yearly": [ { "year", "payments_cents", "interest_cents", "principal_cents", "end_balance_cents" } ], "total_payments_cents", "total_interest_cents", "extra_balance_by_year_cents": null | [ cents ] }`. `extra_balance_by_year_cents` is the balance at year 0 (the loan) and at the end of each year of the extra payment scenario, so the last value is 0. It is `null` when `extra_payment` is `null`. A saved item and a list item have no `schedule`.
- **Saved calculation:** the calculation plus `"id"` (UUID text) and `"created_at"` (ISO 8601 text as stored).
- **Health:** `{ "status": "ok", "database": "ok" | "unavailable" }`, always HTTP 200.
- **`client_id`:** a UUID in the canonical form of 8-4-4-4-12 hexadecimal digits with hyphens, upper or lower case, any version. Braces, a `urn:` prefix or missing hyphens are invalid. It is stored and compared in lower case.
- **`limit`:** ASCII digits only (`5`, `05`; not `+5`, ` 5`, `1.0`, empty), the value from 1 to 50, default 20. A parameter that is given twice is invalid. `client_id` for the list is required.
- **List:** `{ "items": [ saved calculation, ... ] }`.
- **Merging:** the checks of the body, of `client_id` and of `limit` are all done, and all errors are returned together in one `errors` map.
- **422:** `{ "errors": { "<field>": "<message>" } }`. Field names are the request field names, plus `client_id` and `limit`, and `_request` (`Invalid request`) when the body is not usable. Messages: the FR3 texts, the extra payment texts of FR6, `Invalid client id`, `Limit must be between 1 and 50`.
- **503:** `{ "error": "database_unavailable" }`. **500** for anything unexpected: `{ "error": "internal_error" }`, with no details.
- **CORS:** only the origins in `ALLOWED_ORIGINS` (default `http://localhost:5173`). Allowed methods `GET`, `POST`, `OPTIONS`. Allowed request header `Content-Type`. No credentials. The browser may cache a preflight answer for 600 seconds. A preflight request (`OPTIONS` with `Access-Control-Request-Method`) from an allowed origin is answered with those values.

## Module 3: Backend (`backend/app/`)

| File                     | Responsibility                                           | Interface                                                                                                                                          |
| ------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `calc/payment.py`        | Computes the cost figures of one annuity loan.           | `annuity_payment(balance_cents, monthly_rate, months) -> Fraction`, `calculate_loan(loan_cents, annual_rate_hundredths, months) -> LoanResult`     |
| `calc/validate.py`       | Checks the raw text of the fields.                       | `validate_inputs(loan, annual_rate_percent, term_years, extra_monthly_payment="") -> Valid \| Invalid`, `LIMITS`                                   |
| `calc/schedule.py`       | Runs the loan month by month.                            | `build_schedule(loan_cents, annual_rate_hundredths, term_months, regular_payment_cents, extra_cents=0) -> Schedule`                                |
| `calc/extra.py`          | Compares an extra payment with the standard schedule.    | `calculate_extra(standard: Schedule, extra: Schedule) -> ExtraResult` (both schedules hold the loan amount)                                        |
| `service.py`             | Connects checking, calculating and storing.              | `CalculationService(repository)` with `validate(raw)`, `calculate(valid)`, `save(valid, client_id)`, `list(client_id, limit)`, `database_status()` |
| `repository.py`          | The storage interface and an in-memory version.          | `CalculationRepository` (`save`, `list_for_client`, `ping`), `InMemoryRepository`, `RepositoryUnavailable`                                         |
| `supabase_repository.py` | Stores calculations in Supabase over its REST interface. | `SupabaseRepository(url, key, http_client)`, `UnavailableRepository` (used when nothing is configured)                                             |
| `web/`                   | The HTTP layer (see the dependency rules).               | `create_app(service, allowed_origins) -> FastAPI`                                                                                                  |
| `config.py`, `main.py`   | Reads the environment and builds the app.                | `Settings.from_env()`, `app`                                                                                                                       |

**Types.**

- `LIMITS = { "loan_cents": (100000, 1000000000), "rate_hundredths": (0, 2500), "years": (1, 40) }`. The messages are built from it (`1,000` and `10,000,000` in euros).
- `Valid(value)` where `value` has `loan_cents`, `annual_rate_hundredths`, `term_months`, `extra_monthly_cents`. `Invalid(errors)` where `errors` maps a field name to a message. `LoanResult(monthly_payment_cents, total_paid_cents, total_interest_cents)`.
- `Schedule` holds the loan amount and the monthly rows (`payment`, `interest`, `principal`, `balance`, all in cents) and offers `months`, `total_payments`, `total_interest`, `yearly()` (rows as in the contract) and `balances_by_year()` (the loan at year 0, then the end of each year). `ExtraResult(months_to_payoff, total_interest_cents, months_saved, interest_saved_cents, balances_by_year_cents)`.
- All functions of `calc` take whole numbers as plain `int` (a `bool`, a `float`, `NaN` or any other type is wrong). The one exception is `monthly_rate` of `annuity_payment`, which is a `Fraction` (or the `int` 0). A wrong type or a wrong value raises `ValueError`. `annuity_payment` works in cents: its balance is in cents and its result is the payment in cents as an exact `Fraction`.

**Rules for `calc`** (all arithmetic in whole numbers, no floats):

- `annuity_payment`: the exact annuity payment as a `Fraction` (`balance × r / (1 − (1 + r)^−n)`, and `balance / n` when `r = 0`).
- `calculate_loan`: the V1 rules. Payment rounded half up to the cent. Rate 0: total paid = loan, interest 0. Rate above 0: interest = max(0, payment × months − loan), total paid = loan + interest. For a rate with R hundredths of a percent, D = 120000, A = D + R: payment in cents = round half up of `loan_cents × R × A^n / (D × (A^n − D^n))`. No V1 maximums here, a loan of 0 or less, a negative rate or fewer than 1 month raise `ValueError`.
- `validate_inputs`: the V1 syntax, decimals and range checks and messages, using `[0-9]` (ASCII digits only) and `re.fullmatch`. Whitespace is trimmed with an explicit set of characters (the set of JavaScript `trim`, see `01-functional.md`), not with `str.strip()`. In every numeric field, after removing leading zeros, a number with more than 15 digits before the dot is out of range without being converted (so a very long digit string never reaches `int()`). Trailing zeros after the dot are removed before the decimals are counted, so thousands of them are harmless. The extra field: empty after trimming means none; its upper bound is the loan, or 10,000,000 € when the loan has any error. Returns whole cents and hundredths, and `term_months = years × 12`.
- `build_schedule`: interest each month is `(2 × balance × R + D) // (2 × D)`. With `extra_cents = 0` (the standard schedule): payment = the regular payment, but balance + interest when that is not more than the regular payment, and in month `term_months` always balance + interest. With `extra_cents > 0`: payment = min(regular + extra, balance + interest), no adjustment. It stops when the balance is 0, and raises a `RuntimeError` after `term_months + 12` months.
- `calculate_extra`: `months_to_payoff` = months of the extra schedule, `total_interest` = its interest sum, `months_saved` = months of the standard schedule − months to payoff, `interest_saved` = interest of the standard schedule − total interest. Raises `ValueError` if the extra schedule is longer or costs more (that cannot happen). The service never calls it with an extra payment of 0.

**`service`:** `calculate` validates, runs `calculate_loan`, builds the standard schedule, and builds the extra schedule and `calculate_extra` only when the extra payment is above 0. `save` does the same and writes through the repository, without the schedule. `validate` runs `validate_inputs`, and `calculate` and `save` take a `Valid` value. `web` calls `service.validate`, checks `client_id` and `limit` itself, merges all errors into one map, and calls `calculate` or `save` only when there is no error. Nothing from the client except the raw inputs and the client id is stored.

**`repository`:** `save(new)` returns the saved item (with `id` and `created_at`). `list_for_client(client_id, limit)` returns the newest first (`created_at` descending, then `id` descending). The Supabase implementation does not send `id` or `created_at` when saving (the database sets them), uses a timeout of 10 seconds for every request, and passes the stored `created_at` text on unchanged (the database answers in UTC, `+00:00`). `ping()` raises `RepositoryUnavailable` when the database cannot be reached. Every failure of the storage, including an answer that is not understood, becomes `RepositoryUnavailable`. `InMemoryRepository` gives the n-th saved item the id `00000000-0000-4000-8000-` followed by n as 12 decimal digits, and `created_at` equal to `2026-01-01T00:00:00+00:00` plus n seconds, written `YYYY-MM-DDTHH:MM:SS+00:00`.

**Configuration** (environment): `STORAGE` (`supabase` default, or `memory` for local use without a database), `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `ALLOWED_ORIGINS` (comma separated, spaces around items removed; unset means `http://localhost:5173`, set but empty means no origin is allowed). A `STORAGE` value other than `supabase` or `memory` stops the start with a `ValueError`. If `STORAGE=supabase` and the URL or key is missing, the backend uses `UnavailableRepository`: calculating works, saving and the list answer 503, and health shows `database: unavailable`.

## Module 4: Supabase (`supabase/`)

- Project `xvxqhphyrddjhorqoxek`. Migration `supabase/migrations/20261022000000_create_calculations.sql`.
- Table `public.calculations` (every rule below is a `CHECK` or `NOT NULL` constraint in the migration):

| Column                       | Type          | Rule                                     |
| ---------------------------- | ------------- | ---------------------------------------- |
| `id`                         | `uuid`        | primary key, default `gen_random_uuid()` |
| `client_id`                  | `uuid`        | not null                                 |
| `created_at`                 | `timestamptz` | not null, default `now()`                |
| `loan_cents`                 | `bigint`      | not null, 100000 to 1000000000           |
| `annual_rate_hundredths`     | `integer`     | not null, 0 to 2500                      |
| `term_months`                | `integer`     | not null, 12 to 480, a multiple of 12    |
| `extra_monthly_cents`        | `bigint`      | not null, default 0, at least 0          |
| `monthly_payment_cents`      | `bigint`      | not null, at least 0                     |
| `total_paid_cents`           | `bigint`      | not null, at least 0                     |
| `total_interest_cents`       | `bigint`      | not null, at least 0                     |
| `months_to_payoff`           | `integer`     | null, or 1 to 480                        |
| `months_saved`               | `integer`     | null, or 0 to 480                        |
| `extra_total_interest_cents` | `bigint`      | null, or at least 0                      |
| `interest_saved_cents`       | `bigint`      | null, or at least 0                      |

- A further check: the four extra result columns are either all null or all set.
- Index on `(client_id, created_at desc)`. Row level security on, with no policies: the public key reads and writes nothing, only the backend with the secret key does.
- The Supabase security advisors may show an informational notice "RLS enabled, no policy" for this table. It is intended.
- The Supabase MCP connection is read-only and is used only to verify the table after the migration. The app never uses it.

## Repository layout

```
frontend/   package.json, index.html, vite.config.ts, tsconfig.json, src/{api,format,ui,styles}/ identity.ts main.ts
backend/    pyproject.toml, uv.lock, .env.example, app/{calc,web}/ service.py repository.py supabase_repository.py config.py main.py,
            scripts/export_openapi.py, tests/{calc,web,repository,differential,integration}/
api/        openapi.json, examples/*.json
supabase/   migrations/*.sql, README.md
docs/       handoff.md, v1/ (not edited), v2/
scripts/    check-scenarios.ts
package.json   root: npm workspace "frontend", husky, commitlint, lint-staged, eslint, prettier, and scripts that call both sides
```

## Extension points

| Feature (out of scope V2)        | Added                                                                                                                       | Existing modules changed                                                                                                                                                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts and private saved lists | a `user_id` column and a migration of old rows; an auth check in code (row level security does not apply to the secret key) | `supabase/`, `repository` and both implementations (filter by user), `service`, `web` (auth, CORS header `Authorization`), `config.py`, the contract, `frontend/identity`, `api/client`, `ui/form`, `main.ts`                                           |
| Delete a saved calculation       | `DELETE /api/v1/calculations/{id}` that also needs the `client_id`, so an id alone cannot delete                            | the contract and its examples, `web` (the route, and CORS must allow `DELETE`), `service`, `repository` (interface, `InMemoryRepository`, `SupabaseRepository`, `UnavailableRepository`), `frontend/api/client`, `ui/form`                              |
| Monthly table or CSV export      | `monthly` rows in the response (up to 480) or a new endpoint, and a new table or download in the page                       | the contract and examples, `schedule` (rows exist, only an accessor), `service`, `web`, `frontend/api/client` (its shape check and types), `ui/scheduleTable`, `ui/form`                                                                                |
| Fees, insurance, tax             | `calc/costs.py`, request fields                                                                                             | the contract, `validate`, `service`, `ui/form`                                                                                                                                                                                                          |
| Variable rates                   | rate periods in `build_schedule` using `annuity_payment`                                                                    | the contract (`input` shape), `payment`, `validate`, `schedule`, `extra`, `service`, `web`, `frontend/api/client`, `ui/form`, `format/saved` (it shows one rate), `repository`, `supabase_repository` and `supabase/` (one rate column, so a migration) |
| Another database                 | another `CalculationRepository` implementation and its migrations                                                           | `config.py`, `main.py` (the wiring)                                                                                                                                                                                                                     |
| Deployment                       | a Dockerfile, hosting config, `VITE_API_URL` and `ALLOWED_ORIGINS`                                                          | none in code                                                                                                                                                                                                                                            |

## Decisions

| #   | Decision                                                                                          | Reason                                                                                                                                                                          | Alternative considered                        |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | Frontend stays TypeScript                                                                         | The form, its tests and tooling carry over, and the browser still runs JavaScript.                                                                                              | Plain `.js` files                             |
| 2   | The API is a contract, enforced by tests                                                          | A separate service adds moving parts with no benefit now.                                                                                                                       | An API gateway                                |
| 3   | Only the backend validates                                                                        | One set of rules, no drift between two languages.                                                                                                                               | Validation in both places                     |
| 4   | Whole cents in the API, typed text in requests                                                    | No float errors, and the backend owns the parsing rules.                                                                                                                        | Decimal strings                               |
| 5   | Savings are measured against the standard schedule, not the V1 headline                           | The headline multiplies a rounded payment and can be thousands of euros off at extreme rates (4,848.23 € at 10 M €, 25 %, 40 years). The schedule and the savings use one loop. | The V1 headline                               |
| 6   | Saving is a button, the list belongs to a random browser id                                       | No accounts needed, no junk rows from every calculation.                                                                                                                        | Auto-save, accounts                           |
| 7   | The owner runs the migration SQL                                                                  | The MCP connection is read-only.                                                                                                                                                | Switching the MCP connection to write mode    |
| 8   | Python 3.12 through `uv`                                                                          | The machine has Python 3.9 (end of life), and `uv` installs a newer one in the user folder.                                                                                     | The python.org installer                      |
| 9   | Supabase access through its REST interface with `httpx`                                           | One small file behind the repository interface, no client library to track.                                                                                                     | The `supabase` Python package                 |
| 10  | The HTTP layer package is called `web`, not `http`                                                | A package named `http` next to the standard library module of the same name is confusing.                                                                                       | `app/http/`                                   |
| 11  | The backend picks the storage from `STORAGE`, and falls back to "unavailable"                     | The calculator must start and work with no database configured.                                                                                                                 | Failing at start without a database           |
| 12  | npm workspaces with `frontend` as one workspace                                                   | One lockfile, one `npm ci`, and the repo tooling stays at the root.                                                                                                             | Two separate npm projects                     |
| 13  | The schedule is yearly, part of the calculate response, and not stored                            | A yearly table is readable, about 40 rows at most, and the saved rows stay small.                                                                                               | Monthly rows, a separate endpoint, storing it |
| 14  | One loop (`build_schedule`) serves the standard schedule and the extra payment                    | The savings are then exactly the difference of two runs of the same code.                                                                                                       | Two separate loops                            |
| 15  | The chart is drawn by our own SVG code, from the same numbers as the table                        | No chart library to learn or track, and tests can read `data-balances` instead of pixels.                                                                                       | A charting library                            |
| 16  | The 10 second timeout, the 600 second preflight cache and the 20 item list page are fixed numbers | They are easy to test and easy to change in one place.                                                                                                                          | Configurable values                           |
