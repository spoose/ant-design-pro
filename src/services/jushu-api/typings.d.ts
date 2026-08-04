declare namespace JushuAPI {
  type ApiError = {
    success: false;
    errorCode: string;
    errorMessage: string;
    details?: Record<string, unknown>;
    traceId: string;
  };

  type AuthCurrentUser = {
    userId: string;
    username: string;
    name: string;
    avatar: string | null;
    email: string;
    status: UserStatus;
    isSuperAdmin: boolean;
    platformPermissions: string[];
    platformSkillCodes: string[];
    defaultOrganizationId: string | null;
    organizations: OrganizationAccess[];
  };

  type AuthLoginData = {
    accessToken: string;
    tokenType: "Bearer";
    expiresIn: number;
    expiresAt: string;
  };

  type CurrentUserResponse = {
    success: true;
    data: AuthCurrentUser;
    traceId: string;
  };

  type DataScope = {
    dataScopeId: string;
    dataScopeCode: string;
    dataScopeName: string;
    type: DataScopeType;
  };

  type DataScopeType =
    | "organization"
    | "department"
    | "team"
    | "project"
    | "custom";

  type LoginRequest = {
    account: string;
    password: string;
  };

  type LoginResponse = {
    success: true;
    data: AuthLoginData;
    traceId: string;
  };

  type OrganizationAccess = {
    organizationId: string;
    organizationCode: string;
    organizationName: string;
    permissions: string[];
    skillCodes: string[];
    dataScopes: DataScope[];
    defaultDataScopeId: string | null;
  };

  type RegisteredUser = {
    userId: string;
    username: string;
    email: string;
    name: string;
    status: "active";
  };

  type RegisterRequest = {
    username: string;
    email: string;
    name: string;
    password: string;
  };

  type RegisterResponse = {
    success: true;
    data: RegisteredUser;
    traceId: string;
  };

  type SetDefaultOrganizationData = {
    defaultOrganizationId: string;
  };

  type SetDefaultOrganizationRequest = {
    organizationId: string;
  };

  type SetDefaultOrganizationResponse = {
    success: true;
    data: SetDefaultOrganizationData;
    traceId: string;
  };

  type UserStatus = "active" | "disabled" | "deleted";
}
