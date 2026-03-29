# Copilot Instructions (Repo-wide)

## Stack
- Node.js + TypeScript API (ESM)
- Express
- Prisma (PostgreSQL)
- Zod validation
- JWT access tokens + opaque refresh tokens stored hashed in DB with rotation

## Prisma
- Prisma client is generated to: `src/generated/prisma`
- Import Prisma client from the existing project setup (do not import from `@prisma/client` unless the repo already does).
- Models:
  - User(id, username unique, email unique, passwordHash, createdAt)
  - Todo(id, title, completed, createdAt, userId FK -> User)
  - RefreshToken(tokenHash unique, replacedByTokenHash?, revokedAt?, revokeReason?, expiresAt, createdAt, userId)

## Architecture & Conventions
- Keep controllers thin: parse/validate (Zod) + call service + return response.
- Services contain business logic and Prisma operations.
- Prefer explicit `select` to avoid leaking fields (never return passwordHash).
- Minimal helpers; use constants instead of lots of helper functions (avoid overengineering).
- Use early returns.

## Auth Rules
- Access token: JWT with `sub` = userId. Optionally include `username`.
- Refresh token: opaque random string (crypto.randomBytes). NOT JWT.
- Refresh token stored only as hash in DB. Raw token only in HttpOnly cookie.
- Refresh endpoint must NOT use access-token auth middleware.

## Cookies
- Refresh cookie options:
  - httpOnly: true
  - secure: true only in production
  - sameSite: "lax"
  - path limited to `/api/v1/auth`
  - maxAge uses REFRESH_TTL_MS constant
- Refresh rotates and overwrites cookie on each refresh.

## Routes
### Auth
- POST /api/v1/auth/register -> returns `{ user: {id, username}, accessToken }` and sets refresh cookie
- POST /api/v1/auth/login -> returns `{ user: {id, username}, accessToken }` and sets refresh cookie
- POST /api/v1/auth/refresh -> returns `{ accessToken }` and rotates refresh cookie
- POST /api/v1/auth/logout -> revoke current refresh token (if present), clear cookie, return 204
- POST /api/v1/auth/logout-all -> revoke all refresh tokens for user, clear cookie, return 204

### Users
- GET /api/v1/users/me -> returns `{ id, username, email, createdAt }` (no passwordHash)
- PATCH /api/v1/users/me -> allow updating limited fields (username/email) with validation; handle P2002 unique conflicts
- DELETE /api/v1/users/me -> delete user; revoke/cleanup tokens; clear cookie; return 204

### Todos
- All todo endpoints require auth middleware and are scoped to `req.user.id`
- Never allow access to another user’s todos.
- POST /api/v1/todos -> create todo for current user; return created todo
- GET /api/v1/todos -> list only current user todos (basic ordering by createdAt desc)
- GET /api/v1/todos/:id -> only if todo.userId == req.user.id
- PATCH /api/v1/todos/:id -> update title/completed; only owner
- DELETE /api/v1/todos/:id -> only owner; return 204

## Type Safety
- Extend Express Request to include:
  - `req.user?: { id: string; username?: string }`
- Narrow `jwt.verify` result properly (string vs JwtPayload).

## Error Contract
- Success responses: no `success: true` wrapper
- Errors must be consistent:
  - Zod -> `{ message: "Validation error", code: "VALIDATION_ERROR", errors: [{ field, message }] }`
  - CustomAPIError -> `{ message, code }` using `err.code` (NOT err.name)
  - Prisma P2002 -> 409 `{ message: "Already exists", code: "UNIQUE_CONSTRAINT", fields: ["username"] }` when available
  - Prisma P2025 -> 404 `{ message: "Record not found", code: "NOT_FOUND" }`
- Do not leak raw Prisma messages or stack traces in production.

## Validation (Zod)
- All request validation schemas must be placed under:
  - `src/schemas/auth.ts`
  - `src/schemas/users.ts`
  - `src/schemas/todos.ts`
- Do not define Zod schemas inside controllers.
- Controllers must import schemas from the corresponding file in `src/schemas`.
- Use `schema.parse(req.body)` (not safeParse) and let ZodError be handled by global error middleware.

## Auth Schemas
- `registerSchema`
- `loginSchema`
- `refreshSchema` (if needed)
- Keep password validation simple (min length only; avoid overengineering)

## Architecture & Conventions
- `express-async-errors` is used
- Because `express-async-errors` is enabled, async controllers do not need local `try/catch` blocks just to forward errors.
- Let thrown errors bubble to the global error-handling middleware.