export interface AppErrorOptions {
  statusCode: number;
  errorCode: string;
  errorMessage: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(options: AppErrorOptions) {
    super(options.errorMessage, { cause: options.cause });
    this.name = 'AppError';
    this.statusCode = options.statusCode;
    this.errorCode = options.errorCode;
    this.details = options.details;
  }
}
