import { createHash, randomBytes } from 'node:crypto';
import { AppError } from '../errors/appError.js';
import type { PasswordResetRepositoryPort } from '../repositories/passwordResetRepository.js';
import type {
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../schemas/passwordReset.js';
import { PasswordService } from './passwordService.js';

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

export type PasswordResetMode =
  | 'development-response'
  | 'delivery-unavailable';

export interface ForgotPasswordResult {
  accepted: true;
  expiresAt: string;
  developmentResetToken: string;
}

export interface ResetPasswordResult {
  reset: true;
}

export interface PasswordResetServicePort {
  requestReset(input: ForgotPasswordRequest): Promise<ForgotPasswordResult>;
  resetPassword(input: ResetPasswordRequest): Promise<ResetPasswordResult>;
}

const hashToken = (token: string) =>
  createHash('sha256').update(token, 'utf8').digest();

export class PasswordResetService implements PasswordResetServicePort {
  constructor(
    private readonly repository: PasswordResetRepositoryPort,
    private readonly passwords: PasswordService,
    private readonly mode: PasswordResetMode,
  ) {}

  async requestReset(
    input: ForgotPasswordRequest,
  ): Promise<ForgotPasswordResult> {
    if (this.mode !== 'development-response') {
      throw new AppError({
        statusCode: 503,
        errorCode: 'PASSWORD_RESET_DELIVERY_UNAVAILABLE',
        errorMessage: '密码重置邮件服务尚未配置',
      });
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    const user = await this.repository.findActiveUserByEmail(input.email);
    if (user) {
      await this.repository.replaceToken(
        user.userId,
        hashToken(token),
        expiresAt,
      );
    }

    return {
      accepted: true,
      expiresAt: expiresAt.toISOString(),
      developmentResetToken: token,
    };
  }

  async resetPassword(
    input: ResetPasswordRequest,
  ): Promise<ResetPasswordResult> {
    const passwordHash = await this.passwords.hash(input.password);
    const consumed = await this.repository.consumeToken(
      hashToken(input.token),
      passwordHash,
      new Date(),
    );
    if (!consumed) {
      throw new AppError({
        statusCode: 400,
        errorCode: 'PASSWORD_RESET_TOKEN_INVALID',
        errorMessage: '密码重置链接无效或已过期',
      });
    }
    return { reset: true };
  }
}
