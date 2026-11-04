import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import express, { Response } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import helmet from 'helmet';
import { QueryFailedError } from 'typeorm';
import { databaseOptions } from './config';
import { AuthGuard } from './auth';
import { AccountsService } from './accounts.service';
import { RequestsService } from './requests.service';
import {
  AuthController,
  OverviewController,
  RequestsController,
  UsersController,
} from './controllers';
import { documentResponses } from './swagger';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: databaseOptions }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
  ],
  controllers: [
    AuthController,
    RequestsController,
    UsersController,
    OverviewController,
  ],
  providers: [
    AccountsService,
    RequestsService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
class AppModule {}

@Catch()
class ApiErrors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof HttpException) {
      const body = error.getResponse();
      response
        .status(error.getStatus())
        .json(
          typeof body === 'string'
            ? { statusCode: error.getStatus(), message: body }
            : body,
        );
    } else if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === '23505'
    ) {
      response.status(409).json({
        statusCode: 409,
        message: 'An account or record with these details already exists.',
        error: 'Conflict',
      });
    } else {
      console.error(
        'Request failed:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      response.status(500).json({
        statusCode: 500,
        message: 'Something went wrong. Please try again.',
        error: 'Internal Server Error',
      });
    }
  }
}

export async function createApp() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  const origin = process.env.APP_ORIGIN ?? 'http://localhost:5173';
  const production = process.env.NODE_ENV === 'production';
  if (production && !origin.startsWith('https://'))
    throw new Error('APP_ORIGIN must use HTTPS in production.');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: process.env.NODE_ENV === 'test' ? false : ['error', 'warn', 'log'],
  });
  if (production) app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { upgradeInsecureRequests: production ? [] : null },
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(
    (
      error: { status?: number },
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (error.status === 400 || error.status === 413) {
        return res.status(error.status).json({
          statusCode: error.status,
          message:
            error.status === 400
              ? 'The request body must be valid JSON.'
              : 'The request body is too large.',
        });
      }
      next(error);
    },
  );
  app.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) {
        if (req.headers.origin && req.headers.origin !== origin)
          return res.status(403).json({
            statusCode: 403,
            message: 'Request origin is not allowed.',
          });
        if (!req.is('application/json'))
          return res.status(415).json({
            statusCode: 415,
            message: 'Use application/json for API writes.',
          });
      }
      next();
    },
  );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const PgStore = connectPgSimple(session);
  const store = new PgStore({
    pool,
    tableName: 'sessions',
    createTableIfMissing: false,
  });
  app.use(
    session({
      name: 'maintenance.sid',
      secret,
      store,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: production,
        maxAge: 8 * 60 * 60 * 1000,
      },
    }),
  );
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiErrors());
  const swagger = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('University Maintenance API')
      .setDescription(
        'MIT 8333 service requests. Cookie authentication; roles STUDENT, STAFF, OFFICER and ADMIN. See docs/api-contract.md for ownership rules, transitions and error behavior.',
      )
      .setVersion('1.0.0')
      .addCookieAuth('maintenance.sid')
      .build(),
  );
  documentResponses(swagger);
  for (const path of Object.values(swagger.paths)) {
    for (const operation of Object.values(path)) {
      if (
        !operation ||
        typeof operation !== 'object' ||
        !('responses' in operation)
      )
        continue;
      for (const [code, description] of Object.entries({
        400: 'Validation failed',
        401: 'Sign-in required or invalid credentials',
        403: 'Role or origin not allowed',
        404: 'Record not found or inaccessible',
        409: 'Record already exists or state conflict',
        429: 'Too many requests; retry after the rate limit resets',
      })) {
        operation.responses[code] ??= {
          description,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  statusCode: { type: 'integer' },
                  message: {
                    oneOf: [
                      { type: 'string' },
                      { type: 'array', items: { type: 'string' } },
                    ],
                  },
                },
              },
            },
          },
        };
      }
    }
  }
  SwaggerModule.setup('api/docs', app, swagger);
  const webRoot = resolve(__dirname, '../../web/dist');
  if (existsSync(resolve(webRoot, 'index.html'))) {
    app.use(express.static(webRoot));
    app.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        if (
          req.method === 'GET' &&
          !req.path.startsWith('/api') &&
          req.accepts('html')
        )
          res.sendFile(resolve(webRoot, 'index.html'));
        else next();
      },
    );
  }
  await app.init();
  return {
    app,
    swagger,
    close: async () => {
      await app.close();
      store.close();
      await pool.end();
    },
  };
}
