import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import {
  AssignDto,
  ReportQuery,
  RequestDto,
  RequestQuery,
  StatusDto,
} from './dto';
import {
  Assignment,
  Category,
  RequestStatus,
  RoleName,
  ServiceRequest,
  StatusLog,
  User,
} from './entities';
import { literalSearch } from './accounts.service';

@Injectable()
export class RequestsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  private scoped(user: User) {
    const query = this.db.getRepository(ServiceRequest).createQueryBuilder('r');
    if (user.role === RoleName.OFFICER)
      query.andWhere('r.officerId = :userId', { userId: user.id });
    else if (user.role !== RoleName.ADMIN)
      query.andWhere('r.requesterId = :userId', { userId: user.id });
    return query;
  }

  private async accessible(
    manager: EntityManager,
    id: string,
    user: User,
    lock = false,
  ) {
    const request = await manager.findOne(ServiceRequest, {
      where: { id },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    const allowed =
      request &&
      (user.role === RoleName.ADMIN ||
        (user.role === RoleName.OFFICER
          ? request.officerId === user.id
          : request.requesterId === user.id));
    if (!allowed) throw new NotFoundException('Request not found.');
    return request;
  }

  private async category(manager: EntityManager, categoryId: string) {
    if (!(await manager.existsBy(Category, { id: categoryId })))
      throw new BadRequestException('Select a valid category.');
  }

  async list(user: User, query: RequestQuery) {
    const builder = this.scoped(user)
      .leftJoinAndMapOne('r.category', Category, 'c', 'c.id = r.categoryId')
      .leftJoinAndMapOne('r.requester', User, 'u', 'u.id = r.requesterId')
      .leftJoinAndMapOne('r.officer', User, 'o', 'o.id = r.officerId');
    if (query.search)
      builder.andWhere('(r.title ILIKE :search OR r.location ILIKE :search)', {
        search: literalSearch(query.search),
      });
    if (query.status)
      builder.andWhere('r.status = :status', { status: query.status });
    if (query.categoryId)
      builder.andWhere('r.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    const [items, total] = await builder
      .orderBy('r.createdAt', 'DESC')
      .addOrderBy('r.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.ceil(total / query.limit),
    };
  }

  async detail(id: string, user: User) {
    const request = await this.accessible(this.db.manager, id, user);
    const [category, requester, officer, logs, assignments] = await Promise.all(
      [
        this.db.manager.findOneBy(Category, { id: request.categoryId }),
        this.db.manager.findOneBy(User, { id: request.requesterId }),
        request.officerId
          ? this.db.manager.findOneBy(User, { id: request.officerId })
          : null,
        this.db
          .getRepository(StatusLog)
          .createQueryBuilder('l')
          .leftJoinAndMapOne('l.actor', User, 'u', 'u.id = l.actorId')
          .where('l.requestId = :id', { id })
          .orderBy('l.createdAt', 'ASC')
          .addOrderBy('l.id', 'ASC')
          .getMany(),
        this.db
          .getRepository(Assignment)
          .createQueryBuilder('a')
          .leftJoinAndMapOne('a.officer', User, 'u', 'u.id = a.officerId')
          .leftJoinAndMapOne('a.assignedBy', User, 'b', 'b.id = a.assignedById')
          .where('a.requestId = :id', { id })
          .orderBy('a.assignedAt', 'ASC')
          .getMany(),
      ],
    );
    return { ...request, category, requester, officer, logs, assignments };
  }

  async create(user: User, input: RequestDto) {
    return this.db.transaction(async (manager) => {
      await this.category(manager, input.categoryId);
      const request = await manager.save(
        ServiceRequest,
        manager.create(ServiceRequest, {
          ...input,
          requesterId: user.id,
          status: RequestStatus.SUBMITTED,
          officerId: null,
          updatedAt: new Date(),
        }),
      );
      await manager.save(StatusLog, {
        requestId: request.id,
        actorId: user.id,
        status: request.status,
        note: 'Request submitted.',
      });
      return request;
    });
  }

  async update(id: string, user: User, input: RequestDto) {
    return this.db.transaction(async (manager) => {
      const request = await this.accessible(manager, id, user, true);
      if (request.status !== RequestStatus.SUBMITTED)
        throw new ConflictException('Only submitted requests can be edited.');
      await this.category(manager, input.categoryId);
      Object.assign(request, input, { updatedAt: new Date() });
      await manager.save(request);
      await manager.save(StatusLog, {
        requestId: id,
        actorId: user.id,
        status: request.status,
        note: 'Request details updated.',
      });
      return request;
    });
  }

  async remove(id: string, user: User) {
    await this.db.transaction(async (manager) => {
      const request = await this.accessible(manager, id, user, true);
      if (request.status !== RequestStatus.SUBMITTED)
        throw new ConflictException('Only submitted requests can be deleted.');
      await manager.remove(request);
    });
  }

  async assign(id: string, user: User, input: AssignDto) {
    return this.db.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(8333)');
      const request = await this.accessible(manager, id, user, true);
      if (request.status === RequestStatus.COMPLETED)
        throw new ConflictException('Completed requests cannot be reassigned.');
      if (request.officerId === input.officerId)
        throw new ConflictException('This officer is already assigned.');
      const officer = await manager.findOneBy(User, {
        id: input.officerId,
        role: RoleName.OFFICER,
        active: true,
      });
      if (!officer)
        throw new BadRequestException('Choose an active maintenance officer.');
      const now = new Date();
      await manager.update(
        Assignment,
        { requestId: id, endedAt: IsNull() },
        { endedAt: now },
      );
      await manager.save(Assignment, {
        requestId: id,
        officerId: officer.id,
        assignedById: user.id,
        endedAt: null,
      });
      request.officerId = officer.id;
      request.status = RequestStatus.ASSIGNED;
      request.updatedAt = now;
      await manager.save(request);
      await manager.save(StatusLog, {
        requestId: id,
        actorId: user.id,
        status: request.status,
        note: `Assigned to ${officer.name}.`,
      });
      return request;
    });
  }

  async status(id: string, user: User, input: StatusDto) {
    return this.db.transaction(async (manager) => {
      const request = await this.accessible(manager, id, user, true);
      const expected =
        input.status === RequestStatus.IN_PROGRESS
          ? RequestStatus.ASSIGNED
          : RequestStatus.IN_PROGRESS;
      if (request.status !== expected)
        throw new ConflictException(
          `Cannot move from ${request.status} to ${input.status}. Refresh the request and try again.`,
        );
      request.status = input.status;
      request.updatedAt = new Date();
      await manager.save(request);
      if (input.status === RequestStatus.COMPLETED)
        await manager.update(
          Assignment,
          { requestId: id, endedAt: IsNull() },
          { endedAt: request.updatedAt },
        );
      await manager.save(StatusLog, {
        requestId: id,
        actorId: user.id,
        status: input.status,
        note: input.note,
      });
      return request;
    });
  }

  async dashboard(user: User) {
    const rows = await this.scoped(user)
      .select('r.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('r.status')
      .getRawMany<{ status: RequestStatus; count: number }>();
    const counts = Object.fromEntries(
      Object.values(RequestStatus).map((status) => [
        status,
        rows.find((row) => row.status === status)?.count ?? 0,
      ]),
    );
    return { total: rows.reduce((sum, row) => sum + row.count, 0), counts };
  }

  async reports(query: ReportQuery) {
    for (const value of [query.from, query.to]) {
      if (
        value &&
        (Number.isNaN(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value)
      )
        throw new BadRequestException('Enter valid calendar dates.');
    }
    if (query.from && query.to && query.from > query.to)
      throw new BadRequestException(
        'The start date must be on or before the end date.',
      );
    const builder = this.db
      .getRepository(ServiceRequest)
      .createQueryBuilder('r');
    if (query.from)
      builder.andWhere('r.createdAt >= :from', {
        from: `${query.from}T00:00:00Z`,
      });
    if (query.to)
      builder.andWhere(
        "r.createdAt < CAST(:to AS timestamptz) + interval '1 day'",
        { to: `${query.to}T00:00:00Z` },
      );
    const byStatus = await builder
      .clone()
      .select('r.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('r.status')
      .getRawMany<{ status: RequestStatus; count: number }>();
    const byCategory = await builder
      .clone()
      .innerJoin(Category, 'c', 'c.id = r.categoryId')
      .select('c.name', 'name')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('c.name')
      .orderBy('c.name')
      .getRawMany<{ name: string; count: number }>();
    const total = byStatus.reduce((sum, row) => sum + row.count, 0);
    const completed =
      byStatus.find((row) => row.status === RequestStatus.COMPLETED)?.count ??
      0;
    return {
      total,
      completed,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
      byStatus,
      byCategory,
      from: query.from ?? null,
      to: query.to ?? null,
    };
  }
}
