# Contributing

Thanks for taking a look at Quarry.

## Development

1. Install dependencies with `pnpm install`.
2. Start the app with `pnpm dev`.
3. Add or update tests for behavior changes.
4. Run `pnpm lint`, `pnpm test`, `pnpm test:e2e`, and `pnpm build` before opening a pull request.

Keep changes focused. If a change affects imports, persistence, or Arrow value conversion, include a browser-level test where practical.

## Reporting bugs

Please include:

- Browser and operating system
- Steps to reproduce
- Expected and actual behavior
- A minimal SQL query or sample schema when relevant

Do not attach private data. A schema-only reproduction is usually enough.
