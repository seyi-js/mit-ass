import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { Request } from 'express';
import { RoleName, User } from './entities';

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}
export type AuthRequest = Request & { user: User };
export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: RoleName[]) => SetMetadata('roles', roles);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride('public', [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const userId = request.session?.userId;
    if (!userId) throw new UnauthorizedException('Please sign in.');
    const user = await this.db
      .getRepository(User)
      .findOneBy({ id: userId, active: true });
    if (!user)
      throw new UnauthorizedException(
        'Your account is unavailable. Please contact an administrator.',
      );
    const roles = this.reflector.getAllAndOverride<RoleName[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && !roles.includes(user.role))
      throw new ForbiddenException('Your role cannot perform this action.');
    request.user = user;
    return true;
  }
}
