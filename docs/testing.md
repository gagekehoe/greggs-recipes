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
| Recipes facade / Sanity helpers | Mocks for env + clients |
| API routes (`reviews`, `comments`, `profile`, `recipes`, `users`, review images) | Handler tests with mocked session/DB/store |
| Review & comment UI, sign-in, profile forms | `@testing-library/react` + jsdom |

## Intentionally light / excluded from the coverage gate

- **App Router pages** (`src/app/**/page.tsx`) — mostly composition + redirects; better as Playwright later if needed
- **shadcn UI primitives** (`src/components/ui/**`)
- **Auth.js route** (`src/app/api/auth/**`) and `src/auth.ts` — framework wiring
- **SQLite bootstrap** (`src/lib/db/index.ts`) — opens the real file at import time
- Heavier chrome (`auth-nav`, `people-manager`, `recipe-editor`, `site-chrome`) — thin wrappers over already-tested APIs; not worth brittle DOM coverage yet

Prefer keeping `npm test` fast; add Playwright smoke only if a page-level regression keeps slipping through.
