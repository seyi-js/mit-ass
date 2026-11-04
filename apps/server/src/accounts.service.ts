import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Not } from 'typeorm';
import {
  CreateUserDto,
  LoginDto,
  RegisterDto,
  UpdateUserDto,
  UserQuery,
} from './dto';
import { RequestStatus, RoleName, ServiceRequest, User } from './entities';
import { hashPassword, verifyPassword } from './password';

export const safeUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  createdAt: user.createdAt,
});
export const literalSearch = (value: string) =>
  `%${value.replace(/[\\%_]/g, '\\$&')}%`;
const dummyHash = hashPassword('not-an-account-password');

@Injectable()
export class AccountsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async create(input: RegisterDto | CreateUserDto) {
    const user = this.db
      .getRepository(User)
      .create({ ...input, passwordHash: await hashPassword(input.password) });
    return safeUser(await this.db.getRepository(User).save(user));
  }

  async login(input: LoginDto) {
    const user = await this.db
      .getRepository(User)
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: input.email })
      .getOne();
    const valid = await verifyPassword(
      input.password,
      user?.passwordHash ?? (await dummyHash),
    );
    if (!user || !valid || !user.active)
      throw new UnauthorizedException('Email or password is incorrect.');
    return safeUser(user);
  }

  async list(query: UserQuery) {
    const builder = this.db.getRepository(User).createQueryBuilder('u');
    if (query.search)
      builder.andWhere('(u.name ILIKE :search OR u.email ILIKE :search)', {
        search: literalSearch(query.search),
      });
    if (query.role) builder.andWhere('u.role = :role', { role: query.role });
    const [items, total] = await builder
      .orderBy('u.createdAt', 'DESC')
      .addOrderBy('u.id', 'DESC')
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

  async update(id: string, input: UpdateUserDto) {
    return this.db.transaction(async (manager) => {
      // Serialize account restrictions with assignment creation.
      await manager.query('SELECT pg_advisory_xact_lock(8333)');
      const user = await manager.findOneBy(User, { id });
      if (!user) throw new NotFoundException('User not found.');
      if (
        user.role === RoleName.ADMIN &&
        user.active &&
        (!input.active || input.role !== RoleName.ADMIN)
      ) {
        const otherAdmins = await manager.countBy(User, {
          role: RoleName.ADMIN,
          active: true,
          id: Not(id),
        });
        if (!otherAdmins)
          throw new ConflictException(
            'Keep at least one active administrator.',
          );
      }
      if (!input.active || input.role !== RoleName.OFFICER) {
        const assigned = await manager.countBy(ServiceRequest, {
          officerId: id,
          status: Not(RequestStatus.COMPLETED),
        });
        if (assigned)
          throw new ConflictException(
            'Reassign this officer’s unfinished requests first.',
          );
      }
      const revoke = user.role !== input.role || !input.active;
      Object.assign(user, input);
      await manager.save(user);
      if (revoke)
        await manager.query(`DELETE FROM sessions WHERE sess->>'userId' = $1`, [
          id,
        ]);
      return safeUser(user);
    });
  }
}
