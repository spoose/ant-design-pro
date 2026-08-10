declare namespace JushuAPI {
  type AdminUser = {
    userId: string;
    username: string;
    email: string;
    name: string;
    avatar: string | null;
    status: UserStatus;
    isSuperAdmin: boolean;
    defaultOrganizationId: string | null;
    organizations: AdminUserOrganization[];
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };

  type AdminUserListRequest = {
    page: number;
    pageSize: number;
    keyword?: string;
    status?: UserStatus;
    sortBy?: "username" | "email" | "name" | "status" | "createdAt";
    sortOrder?: "asc" | "desc";
  };

  type AdminUserOrganization = {
    organizationId: string;
    organizationCode: string;
    organizationName: string;
  };

  type AdminUserPage = {
    list: AdminUser[];
    page: number;
    pageSize: number;
    total: number;
  };

  type AdminUserPageResponse = {
    success: true;
    data: AdminUserPage;
    traceId: string;
  };

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

  type CreateOrganizationRequest = {
    organizationCode: string;
    organizationName: string;
    status: OrganizationStatus;
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

  type DeletedOrganizationData = {
    organizationId: string;
  };

  type DeleteOrganizationRequest = {
    organizationId: string;
  };

  type DeleteOrganizationResponse = {
    success: true;
    data: DeletedOrganizationData;
    traceId: string;
  };

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

  type OrganizationListResponse = {
    success: true;
    data: OrganizationSummary[];
    traceId: string;
  };

  type OrganizationResponse = {
    success: true;
    data: OrganizationSummary;
    traceId: string;
  };

  type OrganizationStatus = "active" | "disabled";

  type OrganizationSummary = {
    organizationId: string;
    organizationCode: string;
    organizationName: string;
    status: OrganizationStatus;
    createdAt: string;
    updatedAt: string;
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

  type SetAdminUserOrganizationsData = {
    organizations: AdminUserOrganization[];
  };

  type SetAdminUserOrganizationsRequest = {
    userId: string;
    organizationIds: string[];
  };

  type SetAdminUserOrganizationsResponse = {
    success: true;
    data: SetAdminUserOrganizationsData;
    traceId: string;
  };

  type SetAdminUserStatusData = {
    userId: string;
    status: "active" | "disabled";
  };

  type SetAdminUserStatusRequest = {
    userId: string;
    status: "active" | "disabled";
  };

  type SetAdminUserStatusResponse = {
    success: true;
    data: SetAdminUserStatusData;
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

  type UpdateCurrentUserProfileRequest = {
    name?: string;
    avatar?: string | null;
  };

  type UpdateOrganizationRequest = {
    organizationId: string;
    organizationName?: string;
    status?: OrganizationStatus;
  };

  type UserStatus = "active" | "disabled" | "deleted";
}
