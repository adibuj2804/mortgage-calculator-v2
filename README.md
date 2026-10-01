# Mortgage Calculator

A single-page mortgage calculator (Slovak UI). Enter the property price, down payment, interest
rate and loan term to get the monthly payment, total interest and a principal/interest breakdown.

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script            | Purpose                        |
| ----------------- | ------------------------------ |
| `npm run dev`     | Start the dev server           |
| `npm run build`   | Typecheck and build to `dist/` |
| `npm run preview` | Serve the production build     |
| `npm test`        | Run unit tests (Vitest)        |
| `npm run lint`    | ESLint                         |
| `npm run format`  | Prettier                       |

## Project layout

```
src/
  calc/       pure mortgage maths + tests (no DOM)
  ui/         DOM helpers, donut chart, result rendering
  styles/     global CSS
  format.ts   sk-SK number/currency formatting
  main.ts     wiring: inputs → calc → UI
legacy/       v1 single-file version (v1.0.0), kept for reference
```

## For AI agents

Start with [AGENTS.md](AGENTS.md): commands, architecture, conventions and gotchas.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branching model and commit conventions, and
[CHANGELOG.md](CHANGELOG.md) for release history.

The v1 calculator still runs by opening `legacy/mortgage-calculator.html` in a browser.
