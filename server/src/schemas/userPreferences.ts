import { z } from 'zod';

export const setDefaultOrganizationSchema = z
  .object({
    organizationId: z.uuid('organizationId 必须是有效 UUID'),
  })
  .strict();

export type SetDefaultOrganizationRequest = z.infer<
  typeof setDefaultOrganizationSchema
>;
