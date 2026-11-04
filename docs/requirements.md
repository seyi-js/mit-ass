# Assignment scope

Source: **CA – MIT 8333 – Advanced Web Application Development (Virtual lab)**,
2026/2027, 40 marks. This document controls the implementation scope.

## Required application

| Requirement                      | Implementation                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| Registration and login           | Students/staff register; administrators create maintenance officers and administrators.         |
| Role dashboards                  | Student/staff requests, officer assignments, administrator overview.                            |
| Submission and tracking          | Title, category, location, description; request details and status history.                     |
| Administrator management         | User creation, role/active-state changes, assignment, request monitoring, aggregate reports.    |
| Navigation, validation, feedback | Responsive navigation, labelled forms, field validation, loading/error/success feedback.        |
| Authentication and authorization | PostgreSQL-backed sessions, secure password hashes, server-enforced role and ownership checks.  |
| REST API and request CRUD        | Create/list/read/update/delete with documented ownership and status restrictions.               |
| Database                         | PostgreSQL: users, roles, service requests, categories, assignments, status logs.               |
| Four advanced features           | Session authentication; role-based access; search/filter/pagination; Swagger API documentation. |
| Testing                          | Major frontend components, backend endpoint integration tests, complete browser workflow.       |
| Deployment                       | One application service plus PostgreSQL; verify database connectivity online.                   |

Statuses are Submitted → Assigned → In progress → Completed. Reassignment is
available before completion. Only submitted requests can be edited/deleted.
Student/staff users can access only their own requests; officers can access only
their current assignments; administrators can access all requests. Status history
and assignment history fulfil the database requirements. Reports show counts by
status and category for a selected submission-date range.

## Required submission

- A five-minute PowerPoint audiovisual presentation.
- One PDF containing the codebase, output screenshots, and technical report.
- Technical report: introduction/problem, objectives, requirements, frontend,
  backend, database and relationships, API documentation, interface screenshots,
  testing evidence, deployment, challenges/solutions, conclusion.
- Include the GitHub repository URL in the report. The assignment explicitly asks
  for the codebase inside the PDF, so the URL accompanies a source-code appendix.

No file uploads, notifications, real-time updates, or data exports are planned.
The brief does not mandate a technology stack or state a deadline.
