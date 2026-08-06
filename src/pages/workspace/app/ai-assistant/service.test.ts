/**
 * 会话 API 边界测试：确认 Scope 参数、标题更新和后端 History 到 X SDK 的投影。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearLegacyPaiStorage,
  createPaiConversation,
  listPaiConversations,
  toPaiDefaultMessages,
  updatePaiConversationTitle,
} from './service';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({ request: requestMock }));

describe('pAI conversation service', () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      success: true,
      data: [],
      traceId: 'trace',
    });
    localStorage.clear();
  });

  it('keeps platform and organization scope explicit in API calls', async () => {
    await listPaiConversations({ kind: 'platform' });
    await createPaiConversation(
      { kind: 'organization', organizationId: 'org/1' },
      '新对话',
    );

    expect(requestMock).toHaveBeenNthCalledWith(1, '/api/pai/conversations', {
      method: 'GET',
      params: { scopeType: 'platform', limit: 30 },
    });
    expect(requestMock).toHaveBeenNthCalledWith(2, '/api/pai/conversations', {
      method: 'POST',
      data: {
        scopeType: 'organization',
        organizationId: 'org/1',
        title: '新对话',
      },
    });
  });

  it('encodes the conversation id when updating a title', async () => {
    await updatePaiConversationTitle('conversation/1', '合同审查');

    expect(requestMock).toHaveBeenCalledWith(
      '/api/pai/conversations/conversation%2F1',
      { method: 'PATCH', data: { title: '合同审查' } },
    );
  });

  it('projects persisted messages without recreating reasoning', () => {
    const messages = toPaiDefaultMessages({
      conversation: {
        conversationId: 'conversation-1',
        ownerUserId: 'user-1',
        scope: { type: 'platform' },
        title: '合同审查',
        createdAt: '2026-08-05T08:00:00.000Z',
        updatedAt: '2026-08-05T08:01:00.000Z',
      },
      turns: [
        {
          runId: 'run-1',
          turnNo: 1,
          status: 'completed',
          errorCode: null,
          messages: [
            {
              messageId: 'user-message-1',
              role: 'user',
              status: 'completed',
              content: '请审查合同',
              createdAt: '2026-08-05T08:00:00.000Z',
              completedAt: '2026-08-05T08:00:00.000Z',
              sources: [],
            },
            {
              messageId: 'assistant-message-1',
              role: 'assistant',
              status: 'completed',
              content: '存在一处责任边界问题',
              createdAt: '2026-08-05T08:00:01.000Z',
              completedAt: '2026-08-05T08:01:00.000Z',
              sources: [
                {
                  sourceId: 'article-1',
                  sourceType: 'knowledge',
                  title: '审查规范',
                  sourceUpdatedAt: '2026-08-04T08:00:00.000Z',
                },
              ],
            },
          ],
        },
        {
          runId: 'run-2',
          turnNo: 2,
          status: 'failed',
          errorCode: 'AI_MODEL_UNAVAILABLE',
          messages: [
            {
              messageId: 'assistant-message-2',
              role: 'assistant',
              status: 'failed',
              content: '',
              createdAt: '2026-08-05T08:02:00.000Z',
              completedAt: '2026-08-05T08:02:01.000Z',
              sources: [],
            },
          ],
        },
      ],
    });

    expect(messages).toEqual([
      {
        id: 'user-message-1',
        status: 'local',
        message: { role: 'user', content: '请审查合同' },
      },
      {
        id: 'assistant-message-1',
        status: 'success',
        message: {
          role: 'assistant',
          content: '存在一处责任边界问题',
          sources: [
            {
              sourceId: 'article-1',
              sourceType: 'knowledge',
              title: '审查规范',
              updatedAt: '2026-08-04T08:00:00.000Z',
            },
          ],
        },
      },
      {
        id: 'assistant-message-2',
        status: 'error',
        message: {
          role: 'assistant',
          content: '',
          terminalStatus: 'failed',
          errorMessage: '模型服务暂时不可用',
        },
      },
    ]);
  });

  it('removes only legacy pAI local snapshots', () => {
    const removeItem = vi.fn();
    const storage = {
      length: 2,
      key: (index: number) =>
        ['pai:v1:user-1:platform', 'workspace:v1:user-1:platform'][index] ??
        null,
      removeItem,
    } as unknown as Storage;

    clearLegacyPaiStorage(storage);

    expect(removeItem).toHaveBeenCalledOnce();
    expect(removeItem).toHaveBeenCalledWith('pai:v1:user-1:platform');
  });
});
