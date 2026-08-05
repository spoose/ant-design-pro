import { AppError } from '../errors/appError.js';
import type {
  RegisteredUser,
  UserRepositoryPort,
} from '../repositories/userRepository.js';
import type { LoginRequest, RegisterRequest } from '../schemas/auth.js';
import type { IssuedAccessToken } from './accessTokenService.js';
import { AccessTokenService } from './accessTokenService.js';
import { PasswordService } from './passwordService.js';

export interface AuthServicePort {
  register(input: RegisterRequest): Promise<RegisteredUser>;
  login(input: LoginRequest): Promise<IssuedAccessToken>;
}

export class AuthService implements AuthServicePort {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly passwords: PasswordService,
    private readonly tokens: AccessTokenService,
  ) {}

  async register(input: RegisterRequest): Promise<RegisteredUser> {
    const passwordHash = await this.passwords.hash(input.password);
    return this.users.createUser({
      username: input.username,
      email: input.email,
      name: input.name,
      passwordHash,
    });
  }

  async login(input: LoginRequest): Promise<IssuedAccessToken> {
    const user = await this.users.findAuthenticationUserByAccount(input.account);
    const passwordMatches = await this.passwords.verifyLogin(
      user?.passwordHash,
      input.password,
    );

    if (!user || !passwordMatches || user.status !== 'active') {
      throw new AppError({
        statusCode: 401,
        errorCode: 'BAD_CREDENTIALS',
        errorMessage: '用户名或密码错误',
      });
    }

    return this.tokens.issue({
      userId: user.userId,
      tokenVersion: user.tokenVersion,
    });
  }
}
