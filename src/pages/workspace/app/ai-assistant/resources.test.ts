import { fireEvent, render, screen } from '@testing-library/react';
import { App } from 'antd';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import PaiResourcesPage, { validateKnowledgeFile } from './resources';

const textFile = (name: string, content: string) =>
  new File([new TextEncoder().encode(content)], name);

describe('validateKnowledgeFile', () => {
  it('accepts non-empty UTF-8 TXT and Markdown files', async () => {
    await expect(
      validateKnowledgeFile(textFile('资料.txt', '有效正文')),
    ).resolves.toBeUndefined();
    await expect(
      validateKnowledgeFile(textFile('说明.MD', '# 标题')),
    ).resolves.toBeUndefined();
  });

  it('rejects unsupported, empty, and oversized files', async () => {
    await expect(
      validateKnowledgeFile(textFile('资料.pdf', '正文')),
    ).resolves.toContain('不是 TXT 或 Markdown');
    await expect(
      validateKnowledgeFile(textFile('空白.txt', '   ')),
    ).resolves.toContain('没有可上传的正文');
    await expect(
      validateKnowledgeFile(textFile('过长.txt', '文'.repeat(200_001))),
    ).resolves.toContain('超过 200,000 字符限制');
  });
});

describe('PaiResourcesPage', () => {
  it('lets an administrator switch between personal and organization uploads', () => {
    render(
      createElement(
        App,
        null,
        createElement(PaiResourcesPage, {
          initialScopeType: 'personal',
          organizations: [
            {
              organizationId: 'organization-1',
              organizationName: '组织一',
            },
          ],
        }),
      ),
    );

    expect(
      screen.getByText('资料仅属于当前用户，不会进入任何组织知识库。'),
    ).toBeTruthy();
    expect(screen.queryByText('保存范围')).toBeNull();

    fireEvent.click(screen.getByText('组织资料'));

    expect(screen.getByText('目标组织')).toBeTruthy();
    expect(screen.getByText('组织成员可按权限检索')).toBeTruthy();
    expect(screen.getByText('上传到组织一')).toBeTruthy();
  });

  it('fixes organization uploads to the current organization workspace', () => {
    render(
      createElement(
        App,
        null,
        createElement(PaiResourcesPage, {
          fixedOrganizationId: 'organization-1',
          initialOrganizationId: 'organization-1',
          initialScopeType: 'organization',
          organizations: [
            {
              organizationId: 'organization-1',
              organizationName: '组织一',
            },
          ],
        }),
      ),
    );

    expect(screen.queryByRole('combobox', { name: '目标组织' })).toBeNull();
    expect(screen.getByText('当前工作区')).toBeTruthy();
    expect(screen.getByText('上传到组织一')).toBeTruthy();
  });
});
