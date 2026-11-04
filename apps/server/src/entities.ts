import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum RoleName {
  STUDENT = 'STUDENT',
  STAFF = 'STAFF',
  OFFICER = 'OFFICER',
  ADMIN = 'ADMIN',
}
export enum RequestStatus {
  SUBMITTED = 'SUBMITTED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Entity('roles')
export class Role {
  @PrimaryColumn('text')
  name!: RoleName;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  name!: string;

  @Column('text', { unique: true })
  email!: string;

  @Column('text', { select: false })
  passwordHash!: string;

  @Column('text')
  role!: RoleName;

  @Column('boolean', { default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('request_categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { unique: true })
  name!: string;
}

@Entity('service_requests')
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  title!: string;

  @Column('text')
  description!: string;

  @Column('text')
  location!: string;

  @Column('uuid')
  categoryId!: string;

  @Column('uuid')
  requesterId!: string;

  @Column('uuid', { nullable: true })
  officerId!: string | null;

  @Column('text', { default: RequestStatus.SUBMITTED })
  status!: RequestStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column('timestamptz')
  updatedAt!: Date;
}

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  requestId!: string;

  @Column('uuid')
  officerId!: string;

  @Column('uuid')
  assignedById!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  assignedAt!: Date;

  @Column('timestamptz', { nullable: true })
  endedAt!: Date | null;
}

@Entity('status_logs')
export class StatusLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  requestId!: string;

  @Column('uuid')
  actorId!: string;

  @Column('text')
  status!: RequestStatus;

  @Column('text')
  note!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
