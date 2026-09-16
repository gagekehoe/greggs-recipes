# Testing

Vitest lives under `test/`. Run:

```bash
npm test
npm run test:coverage
```

Coverage reporters write to `coverage/` (gitignored). Overall totals and the HTML report land there after `npm run test:coverage`.

## CI (GitHub Actions)

PRs and pushes to `main` run [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

1. `npm ci` + `npm run test:coverage`
2. Vitest enforces gates from `vitest.config.ts` (lines/statements/functions ≥ 75%, branches ≥ 65%)
3. A coverage table is printed to the job log and the Actions **Summary** tab
4. `coverage/` is uploaded as a workflow artifact (HTML + `coverage-summary.json`)

**Vercel does not run Vitest.** Use the PR’s **Checks → Unit tests + coverage** job (and its Summary) for numbers on GitHub.

## What’s covered

| Area | Approach |
|------|----------|
| `src/lib/**` pure helpers | Direct unit tests |
| Reviews store / local recipe store / uploads | Temp dirs + in-memory SQLite |
| Recipe photo fallback helpers | Unit tests for real URL vs placeholder |
| Recipes facade / Sanity helpers | Mocks for env + clients |
| API routes (`reviews`, `comments`, `profile`, `recipes`, `users`, review images, **register / forgot / reset**) | Handler tests with mocked session/DB/store |
| Password auth helpers + reset tokens | Unit + in-memory SQLite; Resend mocked / console path |
| Credentials login (`authorizeCredentials`) | Correct / wrong / unknown email (same null failure) |
| Review & comment UI, sign-in / register / forgot / reset forms | `@testing-library/react` + jsdom |

## Intentionally light / excluded from the coverage gate

- **App Router pages** (`src/app/**/page.tsx`) — mostly composition + redirects; better as Playwright later if needed
- **shadcn UI primitives** (`src/components/ui/**`)
- **Auth.js catch-all** (`src/app/api/auth/[...nextauth]/**`) and `src/auth.ts` wiring — credentials logic lives in `src/lib/auth/credentials.ts` and is tested there
- **SQLite bootstrap** (`src/lib/db/index.ts`) — opens the real file at import time
- Heavier chrome (`auth-nav`, `people-manager`, `recipe-editor`, `site-chrome`) — thin wrappers over already-tested APIs; not worth brittle DOM coverage yet

Prefer keeping `npm test` fast; add Playwright smoke only if a page-level regression keeps slipping through.
