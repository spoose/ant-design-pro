import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { RowDataPacket } from 'mysql2/promise';
import mysql from 'mysql2/promise';
import { loadDatabaseEnv } from '../src/config/env.js';

interface MigrationRow extends RowDataPacket {
  version: string;
}

async function migrate(): Promise<void> {
  const env = loadDatabaseEnv();
  const connection = await mysql.createConnection({
    host: env.host,
    port: env.port,
    database: env.database,
    user: env.user,
    password: env.password,
    multipleStatements: true,
    timezone: 'Z',
  });

  try {
    await connection.query("SET time_zone = '+00:00'");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    const [rows] = await connection.query<MigrationRow[]>(
      'SELECT version FROM schema_migrations',
    );
    const appliedVersions = new Set(rows.map((row) => row.version));
    const migrationsDirectory = resolve(process.cwd(), 'migrations');
    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((fileName) => fileName.endsWith('.sql'))
      .sort();

    for (const fileName of migrationFiles) {
      const version = fileName.slice(0, -4);
      if (appliedVersions.has(version)) {
        continue;
      }

      const sql = await readFile(
        resolve(migrationsDirectory, fileName),
        'utf8',
      );
      await connection.query(sql);
      await connection.execute(
        'INSERT INTO schema_migrations (version) VALUES (?)',
        [version],
      );
      console.info(`Applied migration ${version}`);
    }
  } finally {
    await connection.end();
  }
}

migrate().catch((error: unknown) => {
  console.error('Database migration failed', error);
  process.exitCode = 1;
});
