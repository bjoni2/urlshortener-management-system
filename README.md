# URL Shortening and Management System

A full-stack URL shortener: **Spring Boot** (Java 21) REST API and an **Angular** single-page
application. Registered users shorten URLs, manage them, and see usage statistics; administrators
manage accounts and inspect every link in the system.

---

## Quick start

The fastest way to see it running — no database to install, no Docker required:

```bash
# Terminal 1 — API on http://localhost:8080
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=h2

# Terminal 2 — UI on http://localhost:4200
cd frontend
npm install
npm start
```

Open <http://localhost:4200> and either register a new account or sign in as the seeded
administrator:

| Role          | Email                      | Password    |
| ------------- | -------------------------- | ----------- |
| Administrator | `admin@urlshortener.local` | `Admin123!` |

API documentation is at <http://localhost:8080/swagger-ui.html>.

> The `h2` profile keeps everything in memory, so data is lost on restart. It applies the same
> Flyway migrations as the PostgreSQL deployment, so behaviour is identical.

### Running against PostgreSQL

```bash
docker compose up -d          # PostgreSQL on :5432
cd backend && ./mvnw spring-boot:run
```

---

## What it does

### For a signed-in user

- Shorten any `http(s)` URL, with an optional custom alias.
- Browse their links with **free-text search, status filter, date range, server-side sorting and
  pagination**.
- Edit the expiration date, activate or deactivate a link, or delete it.
- See per-link click counts and last-access times, and dashboard totals: total, active, inactive and
  expired URLs plus total clicks.

### For an administrator

- List every registered account, filtered by email, role or state.
- Activate or deactivate accounts. Deactivation takes effect **immediately** — the account's refresh
  tokens are revoked and its existing access tokens stop being honoured on the very next request.
- View, filter and delete every short URL in the system, and see system-wide statistics.

### For a visitor

`GET /r/{code}` resolves a short link. It answers `302 Found` for a live link, `404` for an unknown
code and `410 Gone` for one that is deactivated or expired.

---

## Architecture

```
urlshortener-management-system/
├── backend/            Spring Boot · Java 21 · Maven
│   └── src/main/java/com/urlshortener/
│       ├── auth/       Registration, login, refresh-token rotation
│       ├── user/       Accounts, roles, admin activate/deactivate
│       ├── url/        Shortening, redirect, search, statistics, expiry sweep
│       ├── admin/      Administrator-only endpoints
│       ├── security/   JWT issuing and validation, account-status filter
│       ├── common/     Pagination envelope, problem-detail error handling
│       └── config/     Security, OpenAPI, typed configuration properties
├── frontend/           Angular · standalone components · signals · Material 3
│   └── src/app/
│       ├── core/       Auth, HTTP interceptor, API clients, models
│       ├── features/   Login, register, dashboard, URLs, administration
│       ├── layout/     Application shell
│       └── shared/     Reusable presentation pieces
├── scripts/            Developer helper scripts (start, stop, create-admin, …)
└── docker-compose.yml  PostgreSQL
```

### Technology

| Concern        | Choice                                                                |
| -------------- | --------------------------------------------------------------------- |
| Language       | Java 21 (LTS) · TypeScript                                            |
| Backend        | Spring Boot, Spring Security, Spring Data JPA, Hibernate              |
| Database       | PostgreSQL, schema versioned with Flyway (H2 for tests and demos)     |
| Authentication | Stateless JWT (HS256) access tokens + rotating opaque refresh tokens  |
| API docs       | springdoc-openapi (OpenAPI 3.1) at `/swagger-ui.html`                 |
| Frontend       | Angular, standalone + zoneless + signals, Angular Material            |
| Build          | Maven (wrapper included) · npm / Angular CLI                          |
| Tests          | JUnit 5, Mockito, AssertJ, MockMvc, Testcontainers · Vitest           |

---

## API

All endpoints are under `/api/v1` and documented in Swagger UI. Bearer token in the
`Authorization` header.

| Method   | Path                           | Access | Purpose                                    |
| -------- | ------------------------------ | ------ | ------------------------------------------ |
| `POST`   | `/auth/register`               | Public | Create an account, receive a token pair    |
| `POST`   | `/auth/login`                  | Public | Exchange credentials for a token pair      |
| `POST`   | `/auth/refresh`                | Public | Rotate a refresh token                     |
| `POST`   | `/auth/logout`                 | Public | Revoke a refresh token                     |
| `GET`    | `/users/me`                    | User   | Current profile                            |
| `POST`   | `/urls`                        | User   | Shorten a URL                              |
| `GET`    | `/urls`                        | User   | Search, filter, sort and paginate own URLs |
| `GET`    | `/urls/stats`                  | User   | Dashboard counters                         |
| `GET`    | `/urls/{id}`                   | User   | Fetch one URL                              |
| `PUT`    | `/urls/{id}`                   | User   | Edit expiration date and activation state  |
| `PATCH`  | `/urls/{id}/activate`          | User   | Activate                                   |
| `PATCH`  | `/urls/{id}/deactivate`        | User   | Deactivate                                 |
| `DELETE` | `/urls/{id}`                   | User   | Delete                                     |
| `GET`    | `/admin/users`                 | Admin  | List registered users                      |
| `PATCH`  | `/admin/users/{id}/activate`   | Admin  | Activate an account                        |
| `PATCH`  | `/admin/users/{id}/deactivate` | Admin  | Deactivate an account                      |
| `GET`    | `/admin/urls`                  | Admin  | List every short URL                       |
| `GET`    | `/admin/urls/stats`            | Admin  | System-wide counters                       |
| `DELETE` | `/admin/urls/{id}`             | Admin  | Delete any short URL                       |
| `GET`    | `/r/{code}`                    | Public | Resolve a short link                       |

---

## Scripts

```bash
./scripts/start.sh                   # start both API and UI (h2 profile)
./scripts/start.sh --backend         # API only
./scripts/start.sh --frontend        # UI only
./scripts/start.sh --profile dev     # PostgreSQL via Docker Compose
./scripts/stop.sh                    # stop everything
./scripts/create-admin.sh boss@example.com
./scripts/create-user.sh jane@example.com
```

---

## Tests

```bash
cd backend  && ./mvnw verify          # fails the build under 80% coverage
cd frontend && npm run test:ci        # fails the build under 80% coverage
```

---

## Task requirements covered

- User registration and login
- Roles: User and Administrator
- URL shortening with optional custom alias
- Public redirect from short URL to original URL
- User URL list with search, filter, sort, pagination
- Edit expiration and activate/deactivate links
- Delete links
- Expired links stop redirecting and are marked by scheduled expiration logic
- Click count and last accessed timestamp tracking
- User dashboard stats (total, active, expired, total clicks)
- Admin: list users, activate/deactivate accounts
- Admin: list and delete all short URLs
- Angular form validation and error messages
- Protected pages for authenticated users
- REST API + Swagger documentation
- ≥ 80% test coverage enforced by the build
