import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  pushWorkspaceRecent,
  readWorkspaceRecents,
  removeWorkspaceRecent,
  titleForWorkspaceRecent,
  WORKSPACE_RECENT_LIMIT,
} from './workspaceRecents';

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return { generatePath, matchPath };
});

const homeUrl = '/workspace/platform/overview';

describe('workspaceRecents', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('skips the home URL and keeps the newest unique path first', () => {
    pushWorkspaceRecent(
      'user-1',
      'platform',
      { title: '工作台', url: homeUrl },
      homeUrl,
    );
    pushWorkspaceRecent(
      'user-1',
      'platform',
      {
        title: '文件审查',
        url: '/workspace/platform/apps/file-review/overview',
      },
      homeUrl,
    );
    pushWorkspaceRecent(
      'user-1',
      'platform',
      { title: '组织管理', url: '/workspace/platform/organizations' },
      homeUrl,
    );
    pushWorkspaceRecent(
      'user-1',
      'platform',
      {
        title: '文件审查',
        url: '/workspace/platform/apps/file-review/queue',
      },
      homeUrl,
    );

    expect(readWorkspaceRecents('user-1', 'platform')).toEqual([
      {
        title: '文件审查',
        url: '/workspace/platform/apps/file-review/queue',
      },
      { title: '组织管理', url: '/workspace/platform/organizations' },
    ]);
  });

  it('caps the list and names apps and platform pages from the URL', () => {
    for (let index = 0; index < WORKSPACE_RECENT_LIMIT + 2; index += 1) {
      pushWorkspaceRecent(
        'user-1',
        'platform',
        {
          title: `应用 ${index}`,
          url: `/workspace/platform/apps/skill-${index}/overview`,
        },
        homeUrl,
      );
    }

    const recents = readWorkspaceRecents('user-1', 'platform');
    expect(recents).toHaveLength(WORKSPACE_RECENT_LIMIT);
    expect(recents[0]?.url).toContain(`skill-${WORKSPACE_RECENT_LIMIT + 1}`);
    expect(titleForWorkspaceRecent('/workspace/platform/users', 'x')).toBe(
      '人员管理',
    );
    expect(
      titleForWorkspaceRecent(
        '/workspace/platform/apps/ai-assistant/overview',
        'x',
      ),
    ).toBe('xOneAI');
  });

  it('removes an entry by app or page key', () => {
    pushWorkspaceRecent(
      'user-1',
      'platform',
      {
        title: '文件审查',
        url: '/workspace/platform/apps/file-review/overview',
      },
      homeUrl,
    );
    pushWorkspaceRecent(
      'user-1',
      'platform',
      { title: '组织管理', url: '/workspace/platform/organizations' },
      homeUrl,
    );

    removeWorkspaceRecent(
      'user-1',
      'platform',
      '/workspace/platform/apps/file-review/queue',
    );

    expect(readWorkspaceRecents('user-1', 'platform')).toEqual([
      { title: '组织管理', url: '/workspace/platform/organizations' },
    ]);
  });
});
