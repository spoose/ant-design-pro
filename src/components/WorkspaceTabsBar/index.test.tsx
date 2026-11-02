import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceTab } from '@/utils/workspaceState';
import WorkspaceTabsBar from './index';

const homeTab = createWorkspaceTab({
  kind: 'home',
  title: '首页',
  url: '/workspace/org/organization-1/home',
});
const appTab = createWorkspaceTab({
  kind: 'app',
  appKey: 'file-review',
  title: '文件审查',
  url: '/workspace/org/organization-1/apps/file-review',
});

describe('WorkspaceTabsBar', () => {
  it('shows AI助手 for a restored Octop tab', () => {
    const octopTab = createWorkspaceTab({
      kind: 'app',
      appKey: 'octop',
      title: 'octop',
      url: '/workspace/org/organization-1/apps/octop/overview',
    });
    render(
      <WorkspaceTabsBar
        tabs={[homeTab, octopTab]}
        activeTabId={homeTab.id}
        onActivate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('tab', { name: 'AI助手' })).toBeVisible();
  });

  it('shows the legacy name for both new and restored AI assistant tabs', () => {
    const legacyTab = createWorkspaceTab({
      kind: 'app',
      appKey: 'ai-assistant',
      title: 'AI助手',
      url: '/workspace/org/organization-1/apps/ai-assistant/overview',
    });
    render(
      <WorkspaceTabsBar
        tabs={[homeTab, legacyTab]}
        activeTabId={homeTab.id}
        onActivate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('tab', { name: /AI助手\(Legacy\)/ })).toBeVisible();
  });

  it('uses antd activeKey and onChange for activation', () => {
    const onActivate = vi.fn();
    const { container } = render(
      <WorkspaceTabsBar
        tabs={[homeTab, appTab]}
        activeTabId={homeTab.id}
        onActivate={onActivate}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: '首页' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(container.querySelector('.anticon-home')).toBeInTheDocument();
    expect(container.querySelector('.anticon-audit')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /文件审查/ }));
    expect(onActivate).toHaveBeenCalledWith(appTab.id);
  });

  it('renders close UI only for App tabs', () => {
    const onClose = vi.fn();
    const { container } = render(
      <WorkspaceTabsBar
        tabs={[homeTab, appTab]}
        activeTabId={appTab.id}
        onActivate={vi.fn()}
        onClose={onClose}
      />,
    );
    const closeButtons = container.querySelectorAll('.ant-tabs-tab-remove');
    expect(closeButtons).toHaveLength(1);
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalledWith(appTab.id);
  });

  it('renders nothing without tabs', () => {
    const { container } = render(
      <WorkspaceTabsBar
        tabs={[]}
        activeTabId=""
        onActivate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
