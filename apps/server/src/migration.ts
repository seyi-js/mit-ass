import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1793548800000 implements MigrationInterface {
  async up(db: QueryRunner): Promise<void> {
    await db.query(`
      CREATE TABLE roles (name text PRIMARY KEY);
      INSERT INTO roles VALUES ('STUDENT'), ('STAFF'), ('OFFICER'), ('ADMIN');
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
        email text NOT NULL UNIQUE, "passwordHash" text NOT NULL,
        role text NOT NULL REFERENCES roles(name), active boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE request_categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE);
      INSERT INTO request_categories(name) VALUES ('Electricity'), ('Furniture'), ('Plumbing'), ('Internet'), ('Classroom equipment'), ('Hostel maintenance');
      CREATE TABLE service_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
        description text NOT NULL, location text NOT NULL,
        "categoryId" uuid NOT NULL REFERENCES request_categories(id),
        "requesterId" uuid NOT NULL REFERENCES users(id),
        "officerId" uuid REFERENCES users(id),
        status text NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','ASSIGNED','IN_PROGRESS','COMPLETED')),
        "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CHECK ((status = 'SUBMITTED' AND "officerId" IS NULL) OR (status <> 'SUBMITTED' AND "officerId" IS NOT NULL))
      );
      CREATE INDEX request_owner_idx ON service_requests("requesterId");
      CREATE INDEX request_officer_idx ON service_requests("officerId");
      CREATE INDEX request_status_idx ON service_requests(status);
      CREATE TABLE assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "requestId" uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
        "officerId" uuid NOT NULL REFERENCES users(id), "assignedById" uuid NOT NULL REFERENCES users(id),
        "assignedAt" timestamptz NOT NULL DEFAULT now(), "endedAt" timestamptz
      );
      CREATE UNIQUE INDEX one_active_assignment ON assignments("requestId") WHERE "endedAt" IS NULL;
      CREATE TABLE status_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "requestId" uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
        "actorId" uuid NOT NULL REFERENCES users(id),
        status text NOT NULL CHECK (status IN ('SUBMITTED','ASSIGNED','IN_PROGRESS','COMPLETED')),
        note text NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX request_logs_idx ON status_logs("requestId", "createdAt");
      CREATE TABLE sessions (sid varchar PRIMARY KEY, sess json NOT NULL, expire timestamp(6) NOT NULL);
      CREATE INDEX sessions_expire_idx ON sessions(expire);
    `);
  }

  async down(db: QueryRunner): Promise<void> {
    await db.query(
      'DROP TABLE sessions, status_logs, assignments, service_requests, request_categories, users, roles',
    );
  }
}
