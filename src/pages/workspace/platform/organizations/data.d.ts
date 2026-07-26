export type OrganizationStatus = 'active' | 'disabled';

/** Platform Super Admin 组织目录中的一条记录。 */
export type OrganizationSummary = {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrganizationInput = {
  organizationCode: string;
  organizationName: string;
  status: OrganizationStatus;
};

export type UpdateOrganizationInput = {
  organizationName?: string;
  status?: OrganizationStatus;
};

export type OrganizationFormValues = CreateOrganizationInput;
