import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AuthCurrentUser } from '@/services/auth';
import AccessPendingPage from '.';

const currentUser = {
  userId: 'workspace-user',
  username: 'workspace-user',
  name: 'Workspace User',
  avatar: null,
  email: 'workspace-user@example.test',
  status: 'active',
  isSuperAdmin: false,
  platformPermissions: [],
  projectAppCodes: [],
  defaultOrganizationId: null,
  organizations: [],
} as AuthCurrentUser;

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    matchPath,
    Navigate: ({ to }: { to: string }) => (
      <div data-testid="pending-redirect">{to}</div>
    ),
    useModel: () => ({ initialState: { currentUser } }),
  };
});

describe('AccessPendingPage', () => {
  it('redirects the historical pending URL to the shared Project home', () => {
    render(<AccessPendingPage />);

    expect(screen.getByTestId('pending-redirect')).toHaveTextContent(
      '/workspace/platform/overview',
    );
  });
});
