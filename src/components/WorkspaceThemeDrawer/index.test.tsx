import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WORKSPACE_APPEARANCE_STORAGE_KEY,
  WORKSPACE_BACKGROUND_ATTRIBUTE,
} from '@/utils/workspaceAppearance';
import WorkspaceThemeDrawer from './index';

const renderDrawer = () =>
  render(<WorkspaceThemeDrawer onClose={vi.fn()} open />);

describe('主题设置抽屉', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute(WORKSPACE_BACKGROUND_ATTRIBUTE);
  });

  it('默认选中默认背景，并同时提供两个选项', () => {
    renderDrawer();

    expect(screen.getByRole('heading', { name: '工作台背景' })).toBeVisible();
    expect(screen.getByRole('radio', { name: '默认' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '冷灰蓝' })).not.toBeChecked();
  });

  it('选择冷灰蓝后写入偏好并标记文档', () => {
    renderDrawer();

    fireEvent.click(screen.getByRole('radio', { name: '冷灰蓝' }));

    expect(window.localStorage.getItem(WORKSPACE_APPEARANCE_STORAGE_KEY)).toBe(
      'cool',
    );
    expect(
      document.documentElement.getAttribute(WORKSPACE_BACKGROUND_ATTRIBUTE),
    ).toBe('cool');
    expect(screen.getByRole('radio', { name: '冷灰蓝' })).toBeChecked();
  });

  it('打开时读取已经保存的偏好', () => {
    window.localStorage.setItem(WORKSPACE_APPEARANCE_STORAGE_KEY, 'cool');

    renderDrawer();

    expect(screen.getByRole('radio', { name: '冷灰蓝' })).toBeChecked();
  });
});
