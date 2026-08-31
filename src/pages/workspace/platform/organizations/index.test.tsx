import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrganizationManagement from '.';

const {
  createOrganizationMock,
  fetchUserInfoMock,
  historyPushMock,
  listOrganizationsMock,
  setInitialStateMock,
} = vi.hoisted(() => ({
  createOrganizationMock: vi.fn(),
  fetchUserInfoMock: vi.fn(),
  historyPushMock: vi.fn(),
  listOrganizationsMock: vi.fn(),
  setInitialStateMock: vi.fn(),
}));

type MockTableRecord = Record<string, unknown>;

type MockColumn = {
  dataIndex?: string;
  hideInTable?: boolean;
  render?: (value: unknown, record: MockTableRecord) => ReactNode;
};

vi.mock('@ant-design/pro-components', () => ({
  ProTable: ({
    columns,
    request,
    toolBarRender,
  }: {
    columns: MockColumn[];
    request: (params: Record<string, unknown>) => Promise<{
      data?: MockTableRecord[];
    }>;
    toolBarRender?: () => ReactNode[];
  }) => {
    const [rows, setRows] = useState<MockTableRecord[]>([]);
    useEffect(() => {
      void request({ current: 1, pageSize: 10 }).then((response) => {
        setRows(response.data ?? []);
      });
    }, [request]);
    return (
      <div>
        {toolBarRender?.()}
        {rows.map((record) => (
          <div key={String(record.organizationId)}>
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
  ModalForm: ({
    children,
    open,
    onFinish,
    title,
  }: {
    children: ReactNode;
    open: boolean;
    onFinish: (values: {
      organizationCode: string;
      organizationName: string;
      status: 'active';
    }) => Promise<boolean>;
    title: ReactNode;
  }) =>
    open ? (
      <div aria-label={String(title)} role="dialog">
        {children}
        <button
          type="button"
          onClick={() => {
            void onFinish({
              organizationCode: 'new_org',
              organizationName: '新组织',
              status: 'active',
            });
          }}
        >
          提交组织
        </button>
      </div>
    ) : null,
  ProFormText: ({
    disabled,
    label,
  }: {
    disabled?: boolean;
    label: ReactNode;
  }) => (
    <label>
      {label}
      <input aria-label={String(label)} disabled={disabled} />
    </label>
  ),
  ProFormSelect: ({ label }: { label: ReactNode }) => (
    <label>
      {label}
      <select aria-label={String(label)} />
    </label>
  ),
}));

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    matchPath,
    history: {
      push: historyPushMock,
    },
    useModel: () => ({
      initialState: {
        fetchUserInfo: fetchUserInfoMock,
        currentUser: {
          userId: 'super-admin-1',
          platformPermissions: [
            'platform:organization:create',
            'platform:organization:update',
            'platform:organization:delete',
          ],
          projectAppCodes: [],
          organizations: [
            {
              organizationId: 'organization-1',
              organizationCode: 'ORG1',
              organizationName: '可进入组织',
              permissions: [],
              appCodes: [],
              dataScopes: [],
            },
          ],
        },
      },
      setInitialState: setInitialStateMock,
    }),
  };
});

vi.mock('./service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./service')>();
  return {
    ...actual,
    createOrganization: createOrganizationMock,
    listOrganizations: listOrganizationsMock,
  };
});

describe('OrganizationManagement', () => {
  beforeEach(() => {
    createOrganizationMock.mockReset();
    historyPushMock.mockReset();
    createOrganizationMock.mockResolvedValue({
      success: true,
      traceId: 'trace-create',
      data: {
        organizationId: 'organization-3',
        organizationCode: 'NEW_ORG',
        organizationName: '新组织',
        status: 'active',
      },
    });
    fetchUserInfoMock.mockReset();
    fetchUserInfoMock.mockResolvedValue({
      userId: 'super-admin-1',
      platformPermissions: ['platform:organization:create'],
      projectAppCodes: [
        'ai-assistant',
        'file-review',
        'document-summary',
        'knowledge-search',
      ],
      organizations: [
        {
          organizationId: 'organization-3',
          organizationCode: 'NEW_ORG',
          organizationName: '新组织',
          permissions: ['organization:*'],
          appCodes: ['file-review', 'document-summary', 'knowledge-search'],
          dataScopes: [],
        },
      ],
    });
    setInitialStateMock.mockReset();
    listOrganizationsMock.mockReset();
    listOrganizationsMock.mockResolvedValue({
      success: true,
      traceId: 'trace-list',
      data: [
        {
          organizationId: 'organization-1',
          organizationCode: 'ORG1',
          organizationName: '组织一',
          status: 'active',
          createdAt: '2026-07-22T00:00:00.000Z',
          updatedAt: '2026-07-22T00:00:00.000Z',
        },
        {
          organizationId: 'organization-2',
          organizationCode: 'ORG2',
          organizationName: '组织二',
          status: 'disabled',
          createdAt: '2026-07-22T00:00:00.000Z',
          updatedAt: '2026-07-22T00:00:00.000Z',
        },
      ],
    });
  });

  it('loads the admin directory and only links organizations the user can enter', async () => {
    render(
      <App>
        <OrganizationManagement />
      </App>,
    );

    expect(await screen.findByText('组织一')).toBeInTheDocument();
    expect(screen.getByText('组织二')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '进入组织' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '进入组织' }));
    expect(historyPushMock).toHaveBeenCalledWith(
      '/workspace/org/organization-1/home',
    );
    expect(
      screen.getByRole('button', { name: /新建组织/ }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(listOrganizationsMock).toHaveBeenCalledWith({
        skipErrorHandler: true,
      }),
    );
  });

  it('keeps the organization code read-only while editing', async () => {
    render(
      <App>
        <OrganizationManagement />
      </App>,
    );

    await screen.findByText('组织一');
    fireEvent.click(screen.getAllByRole('button', { name: '编辑' })[0]);

    expect(
      await screen.findByRole('dialog', { name: '编辑组织' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('组织编码')).toBeDisabled();
  });

  it('refreshes currentUser after creating an organization', async () => {
    render(
      <App>
        <OrganizationManagement />
      </App>,
    );

    await screen.findByText('组织一');
    fireEvent.click(screen.getByRole('button', { name: /新建组织/ }));
    fireEvent.click(await screen.findByRole('button', { name: '提交组织' }));

    await waitFor(() =>
      expect(createOrganizationMock).toHaveBeenCalledWith(
        {
          organizationCode: 'NEW_ORG',
          organizationName: '新组织',
          status: 'active',
        },
        { skipErrorHandler: true },
      ),
    );
    expect(fetchUserInfoMock).toHaveBeenCalledOnce();
    expect(setInitialStateMock).toHaveBeenCalledOnce();

    const updateInitialState = setInitialStateMock.mock.calls[0]?.[0];
    expect(
      updateInitialState({ currentUser: undefined }).currentUser
        .organizations[0],
    ).toMatchObject({
      organizationId: 'organization-3',
      permissions: ['organization:*'],
      appCodes: ['file-review', 'document-summary', 'knowledge-search'],
    });
  });
});
