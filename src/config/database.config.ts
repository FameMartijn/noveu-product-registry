import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

export function parseBoolean(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

export function shouldSynchronize(env: NodeJS.ProcessEnv): boolean {
  if (parseBoolean(env.DB_RUN_MIGRATIONS, false)) return false;

  if (env.DB_SYNCHRONIZE !== undefined) {
    const syncValue = parseBoolean(env.DB_SYNCHRONIZE, false);
    if (env.NODE_ENV === 'production' && syncValue) {
      console.warn('[product-registry] WARNING: DB_SYNCHRONIZE=true in production; prefer migrations.');
    }
    return syncValue;
  }

  return env.NODE_ENV !== 'production';
}

export function getSSLConfig(env: NodeJS.ProcessEnv): boolean | { rejectUnauthorized: boolean } {
  const sslEnabled = parseBoolean(env.DB_SSL, false);
  if (!sslEnabled) return false;
  return { rejectUnauthorized: parseBoolean(env.DB_SSL_REJECT_UNAUTHORIZED, true) };
}

export function validateDatabaseEnv(env: NodeJS.ProcessEnv, serviceName: string): void {
  const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(
      `[${serviceName}] Missing required database env vars: ${missing.join(
        ', ',
      )}. Ensure they are configured before starting the service.`,
    );
  }

  if (env.DB_PASSWORD && (env.DB_PASSWORD === 'password' || env.DB_PASSWORD === 'admin')) {
    throw new Error(`[${serviceName}] Refusing to start with weak DB_PASSWORD value.`);
  }
}

export interface DatabaseConfigOptions {
  serviceName: string;
  schema: string;
  entities: any[];
  migrations?: any[];
  additionalOptions?: Partial<TypeOrmModuleOptions>;
}

export function getDatabaseConfig(env: NodeJS.ProcessEnv, options: DatabaseConfigOptions): TypeOrmModuleOptions {
  validateDatabaseEnv(env, options.serviceName);

  const synchronize = shouldSynchronize(env);
  const runMigrations = parseBoolean(env.DB_RUN_MIGRATIONS, false);

  console.log(`[${options.serviceName}] Database configuration:`);
  console.log(`  Host: ${env.DB_HOST}`);
  console.log(`  Port: ${env.DB_PORT}`);
  console.log(`  Database: ${env.DB_NAME}`);
  console.log(`  Schema: ${options.schema}`);
  console.log(`  Synchronize: ${synchronize}`);
  console.log(`  Run migrations: ${runMigrations}`);
  console.log(`  SSL: ${env.DB_SSL}`);

  return {
    ...(options.additionalOptions || {}),
    type: 'postgres',
    host: String(env.DB_HOST),
    port: parseNumber(env.DB_PORT, 5432),
    username: String(env.DB_USER),
    password: String(env.DB_PASSWORD),
    database: String(env.DB_NAME),
    schema: options.schema,
    entities: options.entities,
    migrations: options.migrations || [],
    synchronize,
    migrationsRun: runMigrations,
    logging: parseBoolean(env.DB_LOGGING, env.NODE_ENV !== 'production'),
    ssl: getSSLConfig(env),
    extra: {
      max: parseNumber(env.DB_MAX_CONNECTIONS, 20),
      connectionTimeoutMillis: parseNumber(env.DB_CONNECTION_TIMEOUT_MS, 2000),
      idleTimeoutMillis: parseNumber(env.DB_IDLE_TIMEOUT_MS, 30000),
      query_timeout: parseNumber(env.DB_MAX_QUERY_TIME, 5000),
    },
    retryAttempts: parseNumber(env.DB_RETRY_ATTEMPTS, 5),
    retryDelay: parseNumber(env.DB_RETRY_DELAY, 3000),
  } as TypeOrmModuleOptions;
}

export function getDataSourceConfig(env: NodeJS.ProcessEnv, options: DatabaseConfigOptions): DataSourceOptions {
  validateDatabaseEnv(env, options.serviceName);

  return {
    type: 'postgres',
    host: String(env.DB_HOST),
    port: parseNumber(env.DB_PORT, 5432),
    username: String(env.DB_USER),
    password: String(env.DB_PASSWORD),
    database: String(env.DB_NAME),
    schema: options.schema,
    entities: options.entities,
    migrations: options.migrations || [],
    synchronize: shouldSynchronize(env),
    logging: parseBoolean(env.DB_LOGGING, env.NODE_ENV !== 'production'),
    ssl: getSSLConfig(env),
  } as DataSourceOptions;
}
