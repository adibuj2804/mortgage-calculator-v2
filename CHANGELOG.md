# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `AGENTS.md` / `CLAUDE.md` guide for AI coding agents.
- Python backend (FastAPI) that does all calculations, an API contract (`api/`) with example files, and a
  Supabase table for saved calculations.
- Extra monthly payment, a yearly repayment schedule, a balance chart, saving and a saved list.

### Changed

- The frontend uses a pink theme (light and dark). Only the colour tokens in `frontend/src/styles/main.css` changed.
- Dependency updates merged: ESLint, Prettier, typescript-eslint, Vite and the GitHub Actions versions.
  TypeScript 7 is not adopted yet because typescript-eslint does not support it.
- The web app moved to `frontend/` and no longer calculates or validates: it calls the API.
- The calculation rules are ported to Python with exact integer arithmetic. The V1 numbers are unchanged
  (checked by differential tests against the V1 TypeScript at tag `v1-final`).

## [2.0.0]

### Changed

- Rebuilt on Vite + TypeScript; markup, styles and behaviour match v1.
- Mortgage maths extracted into `src/calc/mortgage.ts`.

### Added

- Unit tests (Vitest), ESLint, Prettier, Husky hooks and Conventional Commits enforcement.
- GitHub Actions CI, PR/issue templates and Dependabot.

## [1.0.0]

- Initial single-file calculator, preserved in `legacy/mortgage-calculator.html`.

[Unreleased]: https://github.com/adibuj2804/mortgage-calculator-v2/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/adibuj2804/mortgage-calculator-v2/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/adibuj2804/mortgage-calculator-v2/releases/tag/v1.0.0
