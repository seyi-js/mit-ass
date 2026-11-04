import type { OpenAPIObject } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const text: SchemaObject = { type: 'string' };
const uuid: SchemaObject = { type: 'string', format: 'uuid' };
const timestamp: SchemaObject = { type: 'string', format: 'date-time' };
const count: SchemaObject = { type: 'integer', minimum: 0 };
const status: SchemaObject = {
  type: 'string',
  enum: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'],
};
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const array = (name: string): SchemaObject => ({
  type: 'array',
  items: ref(name),
});
const object = (properties: SchemaObject['properties']): SchemaObject => ({
  type: 'object',
  required: Object.keys(properties ?? {}),
  properties,
});
const paginated = (name: string) =>
  object({
    items: array(name),
    total: count,
    page: { type: 'integer', minimum: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
    pages: count,
  });

export function documentResponses(document: OpenAPIObject) {
  const user = object({
    id: uuid,
    name: text,
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['STUDENT', 'STAFF', 'OFFICER', 'ADMIN'] },
    active: { type: 'boolean' },
    createdAt: timestamp,
  });
  const request = object({
    id: uuid,
    title: text,
    description: text,
    location: text,
    categoryId: uuid,
    requesterId: uuid,
    officerId: { ...uuid, nullable: true },
    status,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const summary = object({
    ...request.properties,
    category: ref('CategoryResponse'),
    requester: ref('UserResponse'),
    officer: { allOf: [ref('UserResponse')], nullable: true },
  });
  const schemas = {
    UserResponse: user,
    CategoryResponse: object({ id: uuid, name: text }),
    RequestResponse: request,
    RequestSummary: summary,
    StatusLogResponse: object({
      id: uuid,
      requestId: uuid,
      actorId: uuid,
      status,
      note: text,
      createdAt: timestamp,
      actor: ref('UserResponse'),
    }),
    AssignmentResponse: object({
      id: uuid,
      requestId: uuid,
      officerId: uuid,
      assignedById: uuid,
      assignedAt: timestamp,
      endedAt: { ...timestamp, nullable: true },
      officer: ref('UserResponse'),
      assignedBy: ref('UserResponse'),
    }),
    RequestDetail: object({
      ...summary.properties,
      logs: array('StatusLogResponse'),
      assignments: array('AssignmentResponse'),
    }),
    RequestPage: paginated('RequestSummary'),
    UserPage: paginated('UserResponse'),
    DashboardResponse: object({
      total: count,
      counts: object({
        SUBMITTED: count,
        ASSIGNED: count,
        IN_PROGRESS: count,
        COMPLETED: count,
      }),
    }),
    ReportResponse: object({
      total: count,
      completed: count,
      completionRate: { type: 'integer', minimum: 0, maximum: 100 },
      from: { type: 'string', format: 'date', nullable: true },
      to: { type: 'string', format: 'date', nullable: true },
      byStatus: { type: 'array', items: object({ status, count }) },
      byCategory: { type: 'array', items: object({ name: text, count }) },
    }),
    HealthResponse: object({
      status: { type: 'string', enum: ['ok'] },
      database: { type: 'string', enum: ['connected'] },
    }),
  };
  document.components ??= {};
  document.components.schemas = { ...document.components.schemas, ...schemas };
  const responses: [
    string,
    'get' | 'post' | 'patch',
    number,
    string | SchemaObject,
  ][] = [
    ['/auth/register', 'post', 201, 'UserResponse'],
    ['/auth/login', 'post', 200, 'UserResponse'],
    ['/auth/me', 'get', 200, 'UserResponse'],
    ['/categories', 'get', 200, array('CategoryResponse')],
    ['/requests', 'get', 200, 'RequestPage'],
    ['/requests', 'post', 201, 'RequestResponse'],
    ['/requests/{id}', 'get', 200, 'RequestDetail'],
    ['/requests/{id}', 'patch', 200, 'RequestResponse'],
    ['/requests/{id}/assign', 'post', 200, 'RequestResponse'],
    ['/requests/{id}/status', 'post', 200, 'RequestResponse'],
    ['/users', 'get', 200, 'UserPage'],
    ['/users', 'post', 201, 'UserResponse'],
    ['/users/{id}', 'patch', 200, 'UserResponse'],
    ['/dashboard', 'get', 200, 'DashboardResponse'],
    ['/reports', 'get', 200, 'ReportResponse'],
    ['/health', 'get', 200, 'HealthResponse'],
  ];
  for (const [path, method, code, schema] of responses) {
    const operation = document.paths[`/api${path}`]?.[method];
    if (operation)
      operation.responses[code] = {
        description:
          code === 201 ? 'Created successfully' : 'Successful response',
        content: {
          'application/json': {
            schema: typeof schema === 'string' ? ref(schema) : schema,
          },
        },
      };
  }
  for (const [path, method] of [
    ['/auth/register', 'post'],
    ['/auth/login', 'post'],
    ['/health', 'get'],
  ] as const) {
    const operation = document.paths[`/api${path}`]?.[method];
    if (operation) operation.security = [];
  }
}
