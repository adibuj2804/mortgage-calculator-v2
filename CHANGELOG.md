# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `AGENTS.md` / `CLAUDE.md` guide for AI coding agents.

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
