# Verification evidence

Results are updated after execution; planned tests are not passing evidence.

| Check                                   | Status                                |
| --------------------------------------- | ------------------------------------- |
| Production TypeScript/Vite build        | Passed locally on 1 November 2026.    |
| Frontend component tests                | Passed: 6 tests.                      |
| PostgreSQL API integration tests        | Passed: 14 tests.                     |
| Browser workflow and screenshots        | Passed: complete three-role workflow. |
| Formatting and entity decorator spacing | Passed; all 32 entity fields checked. |
| Public deployment/database connectivity | Pending hosting selection.            |

Latest local verification: **1 November 2026**. `npm test` passed all six frontend
tests and fourteen API integration tests. After the final mobile layout fix,
`PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` passed its full workflow in 6.9
seconds, including a 390-pixel viewport overflow assertion and browser runtime
error checks. Ten screenshots were captured. `npm run format:check` passed.

The exported OpenAPI document parses with 18 operations and 37 resolved schema
references. The local application at `http://localhost:3310/api/health` returned
`{"status":"ok","database":"connected"}`. These are local results; the Docker
image and public HTTPS deployment have not been exercised.

The frontend suite tests form requirements, visible API failures, request tracking
links, status labels, empty results, and pagination limits.

The API suite uses actual PostgreSQL and HTTP requests. It tests authentication,
session cookies, logout, role injection prevention, origin checks, scoped request
CRUD, search/filter/pagination, assignment, state transitions, concurrent updates,
reassignment, user restrictions, session revocation, reports, and Swagger routes.

The browser suite uses three separate browser contexts for student,
administrator, and maintenance officer. It exercises registration, submission,
officer creation, assignment, completion, tracking, reports, search, mobile
navigation, and logout. Screenshots are captured from this local application.

Reproduce with the commands in [README.md](../README.md). API and browser suites
must run sequentially because both reset the configured test database. No
external services are simulated or called by the application.
