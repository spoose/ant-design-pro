import { randomUUID } from 'node:crypto';
import { errors, jwtVerify, SignJWT } from 'jose';
import type { JwtEnv } from '../config/env.js';
import { AppError } from '../errors/appError.js';

export interface IssueAccessTokenInput {
  userId: string;
  tokenVersion: number;
}

export interface IssuedAccessToken {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: string;
}

export interface VerifiedAccessToken {
  userId: string;
  tokenVersion: number;
}

export class AccessTokenService {
  private readonly key: Uint8Array;

  constructor(private readonly config: JwtEnv) {
    this.key = new TextEncoder().encode(config.secret);
  }

  async issue(input: IssueAccessTokenInput): Promise<IssuedAccessToken> {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + this.config.expiresInSeconds;
    const accessToken = await new SignJWT({ tokenVersion: input.tokenVersion })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(input.userId)
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .setJti(randomUUID())
      .sign(this.key);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.expiresInSeconds,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    };
  }

  async verify(token: string): Promise<VerifiedAccessToken> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: ['HS256'],
        issuer: this.config.issuer,
        audience: this.config.audience,
        requiredClaims: ['sub', 'iat', 'exp', 'jti', 'tokenVersion'],
      });

      if (
        typeof payload.sub !== 'string' ||
        payload.sub.length === 0 ||
        typeof payload.iat !== 'number' ||
        typeof payload.jti !== 'string' ||
        payload.jti.length === 0 ||
        typeof payload.tokenVersion !== 'number' ||
        !Number.isSafeInteger(payload.tokenVersion) ||
        payload.tokenVersion < 0
      ) {
        throw new AppError({
          statusCode: 401,
          errorCode: 'ACCESS_TOKEN_INVALID',
          errorMessage: 'Access Token 无效',
        });
      }

      return {
        userId: payload.sub,
        tokenVersion: payload.tokenVersion,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof errors.JWTExpired) {
        throw new AppError({
          statusCode: 401,
          errorCode: 'ACCESS_TOKEN_EXPIRED',
          errorMessage: 'Access Token 已过期',
          cause: error,
        });
      }
      throw new AppError({
        statusCode: 401,
        errorCode: 'ACCESS_TOKEN_INVALID',
        errorMessage: 'Access Token 无效',
        cause: error,
      });
    }
  }
}
