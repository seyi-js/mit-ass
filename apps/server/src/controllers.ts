import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { AccountsService } from './accounts.service';
import { AuthRequest, Public, Roles } from './auth';
import {
  AssignDto,
  CreateUserDto,
  LoginDto,
  RegisterDto,
  ReportQuery,
  RequestDto,
  RequestQuery,
  StatusDto,
  UpdateUserDto,
  UserQuery,
} from './dto';
import { Category, RoleName } from './entities';
import { RequestsService } from './requests.service';

async function startSession(request: Request, userId: string) {
  await new Promise<void>((resolve, reject) =>
    request.session.regenerate((error) => (error ? reject(error) : resolve())),
  );
  request.session.userId = userId;
  await new Promise<void>((resolve, reject) =>
    request.session.save((error) => (error ? reject(error) : resolve())),
  );
}

@ApiTags('Authentication')
@ApiCookieAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly accounts: AccountsService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register as student or staff and start a session' })
  async register(@Body() input: RegisterDto, @Req() request: Request) {
    const user = await this.accounts.create(input);
    await startSession(request, user.id);
    return user;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in and regenerate the session cookie' })
  async login(@Body() input: LoginDto, @Req() request: Request) {
    const user = await this.accounts.login(input);
    await startSession(request, user.id);
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Destroy the current session' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await new Promise<void>((resolve, reject) =>
      request.session.destroy((error) => (error ? reject(error) : resolve())),
    );
    response.clearCookie('maintenance.sid', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Read the current account and role' })
  me(@Req() request: AuthRequest) {
    return request.user;
  }
}

@ApiTags('Service requests')
@ApiCookieAuth()
@Controller('requests')
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  @Get()
  @ApiOperation({
    summary: 'List accessible requests with search, filters and pagination',
  })
  list(@Req() request: AuthRequest, @Query() query: RequestQuery) {
    return this.service.list(request.user, query);
  }

  @Post()
  @Roles(RoleName.STUDENT, RoleName.STAFF)
  @ApiOperation({ summary: 'Submit a service request as student or staff' })
  create(@Req() request: AuthRequest, @Body() input: RequestDto) {
    return this.service.create(request.user, input);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Read an accessible request, assignment history and status logs',
  })
  detail(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthRequest) {
    return this.service.detail(id, request.user);
  }

  @Patch(':id')
  @Roles(RoleName.STUDENT, RoleName.STAFF, RoleName.ADMIN)
  @ApiOperation({
    summary: 'Edit a submitted request as its owner or administrator',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthRequest,
    @Body() input: RequestDto,
  ) {
    return this.service.update(id, request.user, input);
  }

  @Delete(':id')
  @Roles(RoleName.STUDENT, RoleName.STAFF, RoleName.ADMIN)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a submitted request as its owner or administrator',
  })
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthRequest) {
    return this.service.remove(id, request.user);
  }

  @Post(':id/assign')
  @Roles(RoleName.ADMIN)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Assign or reassign an unfinished request to an active officer',
  })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthRequest,
    @Body() input: AssignDto,
  ) {
    return this.service.assign(id, request.user, input);
  }

  @Post(':id/status')
  @Roles(RoleName.ADMIN, RoleName.OFFICER)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Advance an assigned request to in progress, then completed',
  })
  status(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthRequest,
    @Body() input: StatusDto,
  ) {
    return this.service.status(id, request.user, input);
  }
}

@ApiTags('Administration')
@ApiCookieAuth()
@Roles(RoleName.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Search and paginate user accounts' })
  list(@Query() query: UserQuery) {
    return this.accounts.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a user in any supported role' })
  create(@Body() input: CreateUserDto) {
    return this.accounts.create(input);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user’s name, role and active state' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateUserDto) {
    return this.accounts.update(id, input);
  }
}

@ApiTags('Overview')
@ApiCookieAuth()
@Controller()
export class OverviewController {
  constructor(
    private readonly requests: RequestsService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  @Get('categories')
  @ApiOperation({ summary: 'List service-request categories' })
  categories() {
    return this.db.getRepository(Category).find({ order: { name: 'ASC' } });
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Read request totals scoped to the signed-in user' })
  dashboard(@Req() request: AuthRequest) {
    return this.requests.dashboard(request.user);
  }

  @Get('reports')
  @Roles(RoleName.ADMIN)
  @ApiOperation({
    summary:
      'Generate totals by status and category, optionally by submission date (UTC)',
  })
  reports(@Query() query: ReportQuery) {
    return this.requests.reports(query);
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Check API and database connectivity' })
  async health() {
    await this.db.query('SELECT 1');
    return { status: 'ok', database: 'connected' };
  }
}
