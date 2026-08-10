import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UserManagement from '.';

const {
  listAdminUsersMock,
  listOrganizationsMock,
  reloadMock,
  setAdminUserOrganizationsMock,
  setAdminUserStatusMock,
} = vi.hoisted(() => ({
  listAdminUsersMock: vi.fn(),
  listOrganizationsMock: vi.fn(),
  reloadMock: vi.fn(),
  setAdminUserOrganizationsMock: vi.fn(),
  setAdminUserStatusMock: vi.fn(),
}));

type MockRecord = Record<string, unknown>;
type MockColumn = {
  dataIndex?: string;
  hideInTable?: boolean;
  render?: (value: unknown, record: MockRecord) => ReactNode;
  valueEnum?: Record<string, { text: ReactNode }>;
  valueType?: string;
};

vi.mock('@ant-design/pro-components', () => ({
  ProTable: ({
    actionRef,
    columns,
    request,
  }: {
    actionRef?: { current: unknown };
    columns: MockColumn[];
    request: (params: Record<string, unknown>) => Promise<{
      data?: MockRecord[];
    }>;
  }) => {
    const [rows, setRows] = useState<MockRecord[]>([]);
    if (actionRef) actionRef.current = { reload: reloadMock };
    useEffect(() => {
      void request({ current: 1, pageSize: 20 }).then((response) => {
        setRows(response.data ?? []);
      });
    }, [request]);
    return (
      <div>
        {rows.map((record) => (
          <div key={String(record.userId)}>
            {columns
              .filter((column) => !column.hideInTable)
              .map((column, index) => {
                const value = column.dataIndex
                  ? record[column.dataIndex]
                  : undefined;
                return (
                  <div key={column.dataIndex ?? column.valueType ?? index}>
                    {column.render
                      ? column.render(value, record)
                      : (column.valueEnum?.[String(value)]?.text ??
                        String(value ?? ''))}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    );
  },
  ModalForm: ({
    children,
    onFinish,
    open,
    title,
  }: {
    children: ReactNode;
    onFinish: (values: { organizationIds: string[] }) => Promise<boolean>;
    open: boolean;
    title: ReactNode;
  }) =>
    open ? (
      <div aria-label={String(title)} role="dialog">
        {children}
        <button
          type="button"
          onClick={() =>
            void onFinish({
              organizationIds: ['organization-1'],
            })
          }
        >
          提交分配
        </button>
      </div>
    ) : null,
  ProFormSelect: ({ label }: { label: ReactNode }) => <div>{label}</div>,
}));

vi.mock('@/services/jushu-api/platformUsers', () => ({
  listAdminUsers: listAdminUsersMock,
  setAdminUserOrganizations: setAdminUserOrganizationsMock,
  setAdminUserStatus: setAdminUserStatusMock,
}));

vi.mock('@/services/jushu-api/platformOrganizations', () => ({
  listOrganizations: listOrganizationsMock,
}));

describe('UserManagement', () => {
  beforeEach(() => {
    listAdminUsersMock.mockReset();
    listOrganizationsMock.mockReset();
    reloadMock.mockReset();
    setAdminUserOrganizationsMock.mockReset();
    setAdminUserStatusMock.mockReset();
    listAdminUsersMock.mockResolvedValue({
      success: true,
      traceId: 'trace-users',
      data: {
        page: 1,
        pageSize: 20,
        total: 2,
        list: [
          {
            userId: 'user-1',
            username: 'sadmin',
            email: 'sadmin@example.com',
            name: 'Super Admin',
            avatar: null,
            status: 'active',
            isSuperAdmin: true,
            defaultOrganizationId: null,
            organizations: [],
            createdAt: '2026-07-22T00:00:00.000Z',
            updatedAt: '2026-07-22T00:00:00.000Z',
            deletedAt: null,
          },
          {
            userId: 'user-2',
            username: 'member',
            email: 'member@example.com',
            name: '普通成员',
            avatar: null,
            status: 'disabled',
            isSuperAdmin: false,
            defaultOrganizationId: null,
            organizations: [],
            createdAt: '2026-07-21T00:00:00.000Z',
            updatedAt: '2026-07-21T00:00:00.000Z',
            deletedAt: null,
          },
        ],
      },
    });
    listOrganizationsMock.mockResolvedValue({
      success: true,
      traceId: 'trace-organizations',
      data: [
        {
          organizationId: 'organization-1',
          organizationCode: 'ORG1',
          organizationName: '组织一',
          status: 'active',
          createdAt: '2026-07-22T00:00:00.000Z',
          updatedAt: '2026-07-22T00:00:00.000Z',
        },
      ],
    });
    setAdminUserOrganizationsMock.mockResolvedValue({
      success: true,
      traceId: 'trace-membership',
      data: {
        organizations: [
          {
            organizationId: 'organization-1',
            organizationCode: 'ORG1',
            organizationName: '组织一',
          },
        ],
      },
    });
    setAdminUserStatusMock.mockResolvedValue({
      success: true,
      traceId: 'trace-status',
      data: { userId: 'user-2', status: 'active' },
    });
  });

  it('renders users and delegates paging to the generated API client', async () => {
    render(
      <App>
        <UserManagement />
      </App>,
    );

    expect(await screen.findByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('超级管理员')).toBeInTheDocument();
    expect(screen.getByText('@sadmin')).toBeInTheDocument();
    expect(screen.getByText('sadmin@example.com')).toBeInTheDocument();
    expect(screen.getByText('普通成员')).toBeInTheDocument();
    expect(screen.getByText('已停用')).toBeInTheDocument();
    await waitFor(() =>
      expect(listAdminUsersMock).toHaveBeenCalledWith(
        {
          page: 1,
          pageSize: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
        { skipErrorHandler: true },
      ),
    );
  });

  it('persists organization membership through the generated API client', async () => {
    render(
      <App>
        <UserManagement />
      </App>,
    );

    const assignButtons = await screen.findAllByRole('button', {
      name: '分配组织',
    });
    fireEvent.click(assignButtons[0] as HTMLElement);
    expect(
      await screen.findByRole('dialog', { name: '分配组织 · Super Admin' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '提交分配' }));
    await waitFor(() =>
      expect(setAdminUserOrganizationsMock).toHaveBeenCalledWith(
        {
          userId: 'user-1',
          organizationIds: ['organization-1'],
        },
        { skipErrorHandler: true },
      ),
    );
    await waitFor(() => expect(reloadMock).toHaveBeenCalledOnce());
  });

  it('restores a disabled user through the generated API client', async () => {
    render(
      <App>
        <UserManagement />
      </App>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '恢复用户' }));
    await waitFor(() =>
      expect(setAdminUserStatusMock).toHaveBeenCalledWith(
        { userId: 'user-2', status: 'active' },
        { skipErrorHandler: true },
      ),
    );
    await waitFor(() => expect(reloadMock).toHaveBeenCalledOnce());
  });
});
