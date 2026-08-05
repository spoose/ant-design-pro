import type { Pool } from 'mysql2/promise';
import mysql from 'mysql2/promise';
import type { DatabaseEnv } from '../config/env.js';

export function createDatabasePool(env: DatabaseEnv): Pool {
  return mysql.createPool({
    host: env.host,
    port: env.port,
    database: env.database,
    user: env.user,
    password: env.password,
    connectionLimit: env.connectionLimit,
    waitForConnections: true,
    enableKeepAlive: true,
    timezone: 'Z',
  });
}
