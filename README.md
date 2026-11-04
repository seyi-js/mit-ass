# Campus Care

A university maintenance and service-request application for **MIT 8333 —
Advanced Web Application Development (Virtual lab)**. Students and staff submit
requests; administrators assign officers; officers update progress and complete
jobs. Each role has a dashboard and the backend enforces access rules.

## Stack and scope

- React, TypeScript, Vite, React Router, responsive CSS.
- NestJS REST API, TypeORM, PostgreSQL, PostgreSQL-backed cookie sessions.
- Four selected advanced features: session authentication, role-based access,
  search/filter/pagination, and Swagger API documentation.
- Database migrations include all six required entity groups and status history.

See [requirements](docs/requirements.md), [API contract](docs/api-contract.md),
[technical report](docs/technical-report.md), and [deployment guide](docs/deployment.md).

## Run locally

Requires Node.js 22+ and PostgreSQL 15+ (or Docker for the database).

```sh
npm ci
cp .env.example .env
docker compose up -d database
```

Edit `.env`: set a random `SESSION_SECRET` of at least 32 characters and a valid
`ADMIN_EMAIL` / `ADMIN_PASSWORD` (12–128 characters). For a native PostgreSQL
installation, point `DATABASE_URL` to your database instead of starting Docker.
Do not commit `.env`.

```sh
npm run db:setup
npm run dev
```

Open **http://localhost:5173**. Swagger is at **http://localhost:3000/api/docs**.
The frontend development server proxies `/api` to the backend. Keep
`APP_ORIGIN=http://localhost:5173` to match the browser URL.

Register student/staff accounts in the application. Sign in with the initial
administrator to create maintenance officers and other users. The setup command
creates an administrator only when no active administrator exists; it does not
overwrite existing credentials.

## Workflow

1. A student/staff user submits a category, title, location and description.
2. An administrator assigns an active officer.
3. That officer starts work with a progress note, then records completion.
4. The requester sees the complete status and assignment history.
5. Administrators generate reports by submission-date range.

Only submitted requests can be edited or deleted. Reassigning an unfinished
request closes its previous assignment and revokes the old officer’s access.
An officer with unfinished requests must have them reassigned before their role
or active state changes. The last active administrator cannot be deactivated.

## Verification

Create a separate PostgreSQL database whose name ends in `_test` and put its URL
in `TEST_DATABASE_URL`. The tests reset **that database**; never use real data.
For the Docker database above:

```sh
docker compose exec database createdb -U maintenance maintenance_test
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Run API and browser suites sequentially because both use the dedicated test
database. API tests export `docs/openapi.json`; browser tests save interface
screenshots under `docs/screenshots/` and a local Playwright report. There are no
external HTTP service dependencies in the application.

```sh
npm run format:check
```

## Production

`npm run build` compiles both applications; `npm start` serves the API and compiled
frontend together. The Dockerfile also builds this arrangement. Set the public
HTTPS URL as `APP_ORIGIN`, provision PostgreSQL, and configure the environment
described in [deployment](docs/deployment.md). The server runs migrations before
accepting requests; `/api/health` verifies database connectivity.

## Submission

The assignment requires one PDF containing the technical report, screenshots,
and source code, plus a five-minute PowerPoint audiovisual presentation. Add the
GitHub repository and verified deployment URLs to the report before submission.
The GitHub URL accompanies the code appendix because the brief explicitly asks
for all source code in the PDF.
