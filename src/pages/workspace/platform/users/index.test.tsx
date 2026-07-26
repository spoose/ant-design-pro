import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UserManagement from '.';

const listAdminUsersMock = vi.hoisted(() => vi.fn());

type MockRecord = Record<string, unknown>;
type MockColumn = {
  dataIndex?: string;
  hideInTable?: boolean;
  render?: (value: unknown, record: MockRecord) => ReactNode;
};

vi.mock('@ant-design/pro-components', () => ({
  ProTable: ({
    columns,
    request,
  }: {
    columns: MockColumn[];
    request: (params: Record<string, unknown>) => Promise<{
      data?: MockRecord[];
    }>;
  }) => {
    const [rows, setRows] = useState<MockRecord[]>([]);
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
              .map((column, index) => (
                <div key={column.dataIndex ?? index}>
                  {column.render
                    ? column.render(
                        column.dataIndex ? record[column.dataIndex] : undefined,
                        record,
                      )
                    : column.dataIndex
                      ? String(record[column.dataIndex] ?? '')
                      : null}
                </div>
              ))}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('./service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./service')>();
  return { ...actual, listAdminUsers: listAdminUsersMock };
});

describe('UserManagement', () => {
  beforeEach(() => {
    listAdminUsersMock.mockReset();
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
            createdAt: '2026-07-21T00:00:00.000Z',
            updatedAt: '2026-07-21T00:00:00.000Z',
            deletedAt: null,
          },
        ],
      },
    });
  });

  it('renders real users and requests the first page explicitly', async () => {
    render(
      <App>
        <UserManagement />
      </App>,
    );

    expect(await screen.findAllByText('Super Admin')).toHaveLength(2);
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
});
