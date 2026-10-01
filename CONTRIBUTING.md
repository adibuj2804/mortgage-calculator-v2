# Contributing

## Workflow

- `main` is always releasable and protected: changes land through pull requests.
- Branch from `main` using a type prefix: `feat/…`, `fix/…`, `docs/…`, `refactor/…`, `chore/…`.
- Keep branches short-lived and PRs small; merge with `--no-ff` (or squash) after CI is green.
- Releases are annotated tags `vMAJOR.MINOR.PATCH` on `main`; update `CHANGELOG.md` first.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), enforced by a `commit-msg` hook and CI:

```
<type>(<optional scope>): <imperative summary, ≤ 100 chars>

<optional body, wrapped at 100 chars>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
Scopes used here: `calc`, `ui`, `deps`.

## Local checks

```bash
npm ci
npm run lint && npm run typecheck && npm test && npm run build
```

A `pre-commit` hook formats and lints staged files automatically.
