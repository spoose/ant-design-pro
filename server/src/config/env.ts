export type NodeEnvironment = 'development' | 'test' | 'production';

export interface DatabaseEnv {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionLimit: number;
}

export interface JwtEnv {
  secret: string;
  issuer: string;
  audience: string;
  expiresInSeconds: number;
}

export interface DeepSeekEnv {
  apiKey?: string;
  model: string;
}

export interface FirecrawlEnv {
  apiKey?: string;
}

export interface ServerEnv {
  nodeEnv: NodeEnvironment;
  port: number;
  corsOrigins: string[];
  database: DatabaseEnv;
  jwt: JwtEnv;
  deepseek: DeepSeekEnv;
  firecrawl: FirecrawlEnv;
}

function requireJwtEnv(source: EnvSource): JwtEnv {
  const secret = requireValue(source, 'JWT_SECRET');
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('环境变量 JWT_SECRET 至少需要 32 字节');
  }
  if (secret === 'replace-with-at-least-32-random-bytes') {
    throw new Error('环境变量 JWT_SECRET 不能使用示例占位值');
  }

  return {
    secret,
    issuer: requireValue(source, 'JWT_ISSUER'),
    audience: requireValue(source, 'JWT_AUDIENCE'),
    expiresInSeconds: requireInteger(
      source,
      'JWT_EXPIRES_IN_SECONDS',
      300,
      86_400,
    ),
  };
}

type EnvSource = Record<string, string | undefined>;

function requireValue(source: EnvSource, name: string): string {
  const value = source[name]?.trim();
  if (!value) {
    throw new Error(`缺少必需环境变量：${name}`);
  }
  return value;
}

function requireInteger(
  source: EnvSource,
  name: string,
  minimum: number,
  maximum: number,
): number {
  const rawValue = requireValue(source, name);
  if (!/^\d+$/.test(rawValue)) {
    throw new Error(`环境变量 ${name} 必须是整数`);
  }

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`环境变量 ${name} 必须介于 ${minimum} 和 ${maximum} 之间`);
  }
  return value;
}

function requireNodeEnvironment(source: EnvSource): NodeEnvironment {
  const value = requireValue(source, 'NODE_ENV');
  if (value !== 'development' && value !== 'test' && value !== 'production') {
    throw new Error('环境变量 NODE_ENV 必须是 development、test 或 production');
  }
  return value;
}

function requireCorsOrigins(source: EnvSource): string[] {
  const origins = requireValue(source, 'CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('环境变量 CORS_ORIGINS 至少需要一个来源');
  }

  for (const origin of origins) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error(`CORS_ORIGINS 包含无效来源：${origin}`);
    }
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.origin !== origin
    ) {
      throw new Error(`CORS_ORIGINS 必须是完整的 HTTP(S) 来源：${origin}`);
    }
  }

  return [...new Set(origins)];
}

export function loadDatabaseEnv(source: EnvSource = process.env): DatabaseEnv {
  return {
    host: requireValue(source, 'MYSQL_HOST'),
    port: requireInteger(source, 'MYSQL_PORT', 1, 65_535),
    database: requireValue(source, 'MYSQL_DATABASE'),
    user: requireValue(source, 'MYSQL_USER'),
    password: requireValue(source, 'MYSQL_PASSWORD'),
    connectionLimit: requireInteger(source, 'MYSQL_CONNECTION_LIMIT', 1, 100),
  };
}

export function loadDeepSeekEnv(source: EnvSource = process.env): DeepSeekEnv {
  const apiKey = source.DEEPSEEK_API_KEY?.trim() || undefined;
  const model = source.DEEPSEEK_MODEL?.trim() || 'deepseek-v4-flash';
  return apiKey ? { apiKey, model } : { model };
}

/**
 * 读取 Firecrawl 搜索配置。
 *
 * Key 不属于认证服务的必填配置：未配置时认证与其他 Agent 仍可启动；
 * 是否允许无 Key 搜索以及可用额度，由 Firecrawl 服务端策略决定。
 */
export function loadFirecrawlEnv(
  source: EnvSource = process.env,
): FirecrawlEnv {
  const apiKey = source.FIRECRAWL_API_KEY?.trim() || undefined;
  return apiKey ? { apiKey } : {};
}

export function loadServerEnv(source: EnvSource = process.env): ServerEnv {
  return {
    nodeEnv: requireNodeEnvironment(source),
    port: requireInteger(source, 'PORT', 1, 65_535),
    corsOrigins: requireCorsOrigins(source),
    database: loadDatabaseEnv(source),
    jwt: requireJwtEnv(source),
    deepseek: loadDeepSeekEnv(source),
    firecrawl: loadFirecrawlEnv(source),
  };
}
