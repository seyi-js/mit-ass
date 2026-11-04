import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { DataSource, DataSourceOptions } from 'typeorm';
import {
  Assignment,
  Category,
  Role,
  ServiceRequest,
  StatusLog,
  User,
} from './entities';
import { InitialSchema1793548800000 } from './migration';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });

export function databaseOptions(): DataSourceOptions {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required. Copy .env.example to .env.');
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [User, Role, Category, ServiceRequest, Assignment, StatusLog],
    migrations: [InitialSchema1793548800000],
    migrationsRun: true,
    synchronize: false,
  };
}

export const createDataSource = () => new DataSource(databaseOptions());
