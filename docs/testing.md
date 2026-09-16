# Testing

Vitest lives under `test/`. Run:

```bash
npm test
npm run test:coverage
```

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
