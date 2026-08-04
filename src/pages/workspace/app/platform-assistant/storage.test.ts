/**
 * 浏览器持久化测试：
 * 覆盖 Scope 隔离、流状态恢复、来源校验和 X SDK 消息标识重建。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildPaiStorageKey,
  createEmptyPaiWorkspaceState,
  loadPaiWorkspaceState,
  savePaiWorkspaceState,
  toPaiDefaultMessages,
} from './storage';
import type { PaiWorkspaceState } from './types';

describe('pAI local conversation storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('isolates conversations by user and workspace scope', () => {
    expect(buildPaiStorageKey('user:1', 'platform')).toBe(
      'pai:v1:user%3A1:platform',
    );
    expect(buildPaiStorageKey('user:1', 'platform')).not.toBe(
      buildPaiStorageKey('user:2', 'platform'),
    );
    expect(buildPaiStorageKey('user:1', 'platform')).not.toBe(
      buildPaiStorageKey('user:1', 'organization:org-1'),
    );
  });

  it('falls back to a usable draft conversation when stored JSON is invalid', () => {
    localStorage.setItem('invalid-pai-state', '{invalid');

    const state = loadPaiWorkspaceState('invalid-pai-state');

    expect(state.conversations).toHaveLength(1);
    expect(state.conversations[0]).toMatchObject({
      label: '新对话',
      isDraft: true,
      messages: [],
    });
    expect(state.activeConversationKey).toBe(state.conversations[0].key);
  });

  it('restores an interrupted streaming message as stopped', () => {
    const state = createEmptyPaiWorkspaceState();
    const conversation = state.conversations[0];
    const interruptedState: PaiWorkspaceState = {
      ...state,
      conversations: [
        {
          ...conversation,
          messages: [
            {
              id: 'assistant-1',
              status: 'updating',
              message: {
                role: 'assistant',
                content: '尚未完成',
              },
            },
          ],
        },
      ],
    };

    savePaiWorkspaceState('streaming-pai-state', interruptedState);
    const restoredState = loadPaiWorkspaceState('streaming-pai-state');

    expect(restoredState.conversations[0].messages[0].status).toBe('abort');
  });

  it('persists validated message sources with the assistant message', () => {
    const state = createEmptyPaiWorkspaceState();
    const conversation = state.conversations[0];
    const stateWithSources: PaiWorkspaceState = {
      ...state,
      conversations: [
        {
          ...conversation,
          messages: [
            {
              id: 'assistant-with-sources',
              status: 'success',
              message: {
                role: 'assistant',
                content: '知识库回答',
                sources: [
                  {
                    sourceId: 'article-001',
                    sourceType: 'knowledge',
                    title: '第一篇资料',
                    sourceUrl: 'https://example.com/article-001',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    savePaiWorkspaceState('sources-state', stateWithSources);
    const restoredState = loadPaiWorkspaceState('sources-state');

    expect(restoredState.conversations[0].messages[0].message.sources).toEqual([
      {
        sourceId: 'article-001',
        sourceType: 'knowledge',
        title: '第一篇资料',
        sourceUrl: 'https://example.com/article-001',
      },
    ]);
  });

  it('drops persisted SDK ids before hydrating useXChat', () => {
    const defaultMessages = toPaiDefaultMessages([
      {
        id: 'msg_2',
        status: 'success',
        message: {
          role: 'assistant',
          content: '<think>历史思考</think>历史回答',
        },
      },
    ]);

    expect(defaultMessages).toEqual([
      {
        status: 'success',
        message: {
          role: 'assistant',
          content: '<think>历史思考</think>历史回答',
        },
      },
    ]);
    expect(defaultMessages[0]).not.toHaveProperty('id');
  });
});
