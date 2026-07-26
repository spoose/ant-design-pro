export type AdminUserStatus = 'active' | 'disabled' | 'deleted';

export type AdminUser = {
  userId: string;
  username: string;
  email: string;
  name: string;
  avatar: string | null;
  status: AdminUserStatus;
  isSuperAdmin: boolean;
  defaultOrganizationId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type AdminUserPage = {
  list: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminUserListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: AdminUserStatus;
  sortBy: 'username' | 'email' | 'name' | 'status' | 'createdAt';
  sortOrder: 'asc' | 'desc';
};
