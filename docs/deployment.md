# Deployment and GitHub

The application is prepared for one Node.js service behind an HTTPS reverse proxy
and a PostgreSQL database. No hosting provider or GitHub repository has been
selected. Instructions below are deployment preparation, not evidence of a live
deployment.

## GitHub

Initialize a repository in the project root, review the staged files, commit, and
push to the chosen GitHub repository. Include application sources, migrations,
tests, lockfile, documentation, and screenshots. `.gitignore` excludes `.env`,
local database storage, dependencies, generated builds, and temporary test output.

Record the final repository URL and tested commit in the technical report.

## Hosting configuration

Use the Dockerfile, or configure a Node.js 22+ service with:

- Build command: `npm ci && npm run build`
- Start command: `node apps/server/dist/setup.js && npm start`
- Health path: `/api/health`
- Port: the provider’s `PORT` environment variable (default 3000)

Provision PostgreSQL 15 or later, create an application database, and set:

| Variable         | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`   | Provider-issued PostgreSQL connection URL; follow its TLS requirements. |
| `SESSION_SECRET` | A cryptographically random value of at least 32 characters.             |
| `APP_ORIGIN`     | Exact public HTTPS origin, without a trailing slash.                    |
| `NODE_ENV`       | `production`                                                            |
| `ADMIN_EMAIL`    | Initial administrator’s email.                                          |
| `ADMIN_PASSWORD` | Strong initial password, 12–128 characters.                             |
| `ADMIN_NAME`     | Initial administrator’s display name.                                   |

The service expects one trusted reverse-proxy hop in production so secure cookies
work behind HTTPS termination. Do not expose the application directly over plain
HTTP in production. Serve frontend and API on the same origin. No CORS setup is
needed. Configure the provider’s PostgreSQL TLS connection parameters without
disabling certificate verification.

Migrations create tables and fault categories. The setup command creates the
initial administrator if none exists. After successful initial setup, remove the
bootstrap `ADMIN_PASSWORD` from the hosting environment; the existing account
does not need it to restart. Sessions are stored in PostgreSQL and survive server
restarts. Keep the same `SESSION_SECRET` when restarting.

## Live verification still required

1. Open `/api/health` and capture `{"status":"ok","database":"connected"}`.
2. Register a student and sign in as the administrator.
3. Create an officer and submit, assign, start, and complete a request.
4. Confirm that the student sees the final status and history.
5. Restart the service and verify that the request and authenticated session
   persist.
6. Check `/api/docs`, the reports screen, and a mobile viewport.
7. Record the public URL, host, database provider, date, commit, and evidence in
   the technical report. Replace local-only screenshots where appropriate.
