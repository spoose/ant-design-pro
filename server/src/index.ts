import 'dotenv/config';
import type { Server } from 'node:http';
import { createApp } from './app.js';
import { loadServerEnv } from './config/env.js';
import { createDatabasePool } from './db/pool.js';

async function start(): Promise<void> {
  const env = loadServerEnv();
  const pool = createDatabasePool(env.database);

  try {
    await pool.query('SELECT 1 AS ok');
  } catch (error) {
    await pool.end();
    throw new Error('启动失败：无法连接 MySQL', { cause: error });
  }

  const app = createApp({
    pool,
    nodeEnv: env.nodeEnv,
    corsOrigins: env.corsOrigins,
    jwt: env.jwt,
    deepseek: env.deepseek,
    firecrawl: env.firecrawl,
  });
  let httpServer: Server;
  try {
    httpServer = await new Promise<Server>((resolve, reject) => {
      const server = app.listen(env.port);
      server.once('listening', () => resolve(server));
      server.once('error', reject);
    });
  } catch (error) {
    await pool.end();
    throw error;
  }
  console.info(`Auth server listening on port ${env.port} (${env.nodeEnv})`);

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.info(`Received ${signal}, shutting down`);

    httpServer.close(async (error) => {
      try {
        await pool.end();
      } finally {
        if (error) {
          console.error('HTTP server shutdown failed', error);
          process.exitCode = 1;
        }
      }
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch((error: unknown) => {
  console.error('Auth server failed to start', error);
  process.exitCode = 1;
});
