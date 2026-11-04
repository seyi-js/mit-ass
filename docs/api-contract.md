# Maintenance API contract

All endpoints use `/api`. Bodies are JSON; unknown fields are rejected. Invalid
input returns 400; no session returns 401; disallowed roles return 403;
inaccessible requests return 404; conflicting state returns 409. Errors have
`statusCode`, `message` (string or field-error array), and `error` where available.
Session cookies are HttpOnly and SameSite=Lax, Secure in production, and expire
after eight hours. Send cookies on subsequent calls. Browser writes require the
configured application Origin. Login regenerates the session; logout destroys it.

| Method | Path                 | Caller / behavior                                                                        |
| ------ | -------------------- | ---------------------------------------------------------------------------------------- |
| POST   | /auth/register       | Public: name, email, password, role STUDENT or STAFF; starts session.                    |
| POST   | /auth/login          | Public: email/password; starts session.                                                  |
| POST   | /auth/logout         | Signed in: ends session.                                                                 |
| GET    | /auth/me             | Signed in: current profile including current role.                                       |
| GET    | /categories          | Signed in: available fault categories.                                                   |
| GET    | /requests            | Signed in: scoped requests; search, status, categoryId, page, limit.                     |
| POST   | /requests            | Student/staff: title, description, location, categoryId; returns 201.                    |
| GET    | /requests/:id        | Owner, assigned officer, admin: full request and history.                                |
| PATCH  | /requests/:id        | Owner/admin, Submitted only: same fields as creation.                                    |
| DELETE | /requests/:id        | Owner/admin, Submitted only: returns 204.                                                |
| POST   | /requests/:id/assign | Admin: officerId; records assignment and status history.                                 |
| POST   | /requests/:id/status | Current officer/admin: status IN_PROGRESS or COMPLETED, note.                            |
| GET    | /dashboard           | Signed in: status totals scoped by role/ownership.                                       |
| GET    | /users               | Admin: search, role, page, limit; no password hashes.                                    |
| POST   | /users               | Admin: name, email, password, role; returns 201.                                         |
| PATCH  | /users/:id           | Admin: name, role, active; protects last active admin and assigned officers.             |
| GET    | /reports             | Admin: optional from/to ISO dates; counts by status/category, total and completion rate. |
| GET    | /health              | Public: confirms API and PostgreSQL availability.                                        |

Lists return `{ items, total, page, limit, pages }`. Page defaults to 1 and limit
to 10; maximum limit is 100. Filter changes must reset the page. Results are
ordered by creation time descending, then ID. Empty lists return an empty array
and zero pages. Search uses case-insensitive literal substring matching.

Roles: STUDENT, STAFF, OFFICER, ADMIN. Request states: SUBMITTED, ASSIGNED,
IN_PROGRESS, COMPLETED. Transition to IN_PROGRESS requires ASSIGNED; transition
to COMPLETED requires IN_PROGRESS. Reassignment resets a non-completed request to
ASSIGNED and closes the previous assignment. Every mutation is transactional;
the request row is locked during state changes. The API never trusts a role or
requester supplied by the browser.

Swagger at `/api/docs` is generated from the controllers and DTOs. Its JSON is
available at `/api/docs-json`; the build's exported copy belongs in
`docs/openapi.json`. This prose contract is established before implementation;
Swagger is the machine-readable implementation reference.
