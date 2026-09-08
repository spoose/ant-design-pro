import { RobotFilled } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Bubble,
  type BubbleItemType,
  type BubbleListProps,
  Sender,
} from '@ant-design/x';
import XMarkdown from '@ant-design/x-markdown';
import { type SSEOutput, XRequest } from '@ant-design/x-sdk';
import { createAvatar } from '@bible-strong/avatar-react';
import { Alert, App, Button, Card, Input, Tag } from 'antd';
import { useEffect, useRef, useState } from 'react';
import strobiDefinition from '@/pages/workspace/platform/overview/strobi.avatar.json';
import { getAccessToken } from '@/utils/authToken';
import '@bible-strong/avatar-react/styles.css';
import { useStyles } from './style';

type XoneChatRequest = {
  agentId: string;
  conversationId: string;
  knowledgeBaseId: string;
  message: string;
};

/**
 * 核心链路：
 * Sender -> XRequest POST -> Umi /web 代理（XONE_API_TARGET）
 * -> XOne text/event-stream -> onUpdate 拼接 data -> Bubble 展示
 * -> onSuccess / onError 收口状态。
 *
 * 浏览器只请求相对路径，避免跨域；联调服务地址由启动环境变量提供。
 */
/** XMarkdown 流式标记：收到增量时开启动画，结束置空闲。 */
const STREAMING_ACTIVE = { hasNextChunk: true, enableAnimation: true };
const STREAMING_IDLE = { hasNextChunk: false, enableAnimation: false };

/** 打字机步进参数：间隔与每步字符数（与官方 Bubble 示例同量级）。 */
const TYPING_INTERVAL_MS = 20;
const TYPING_STEP = 3;

const ENDPOINT = '/web/ai/llm/chat/chat/stream';
const StrobiAvatar = createAvatar(strobiDefinition);

/**
 * 自研打字机：content 增长时逐步扩大显示切片，切片实时经 XMarkdown 渲染。
 * antd x 内置 typing 与 contentRender(ReactNode) 互斥，故仿照官方示例自行步进。
 */
const TypingMarkdown = ({ content }: { content: string }) => {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= content.length) return undefined;
    const timerId = window.setTimeout(() => {
      setVisible((previous) =>
        Math.min(previous + TYPING_STEP, content.length),
      );
    }, TYPING_INTERVAL_MS);
    return () => window.clearTimeout(timerId);
  }, [content, visible]);

  return (
    <XMarkdown
      streaming={visible < content.length ? STREAMING_ACTIVE : STREAMING_IDLE}
    >
      {content.slice(0, visible)}
    </XMarkdown>
  );
};

const bubbleRoles: BubbleListProps['role'] = {
  user: { placement: 'end' },
  ai: {
    placement: 'start',
    avatar: (
      <StrobiAvatar
        ariaLabel="xOneAI 助手 Strobi"
        defaultAnimation="listening"
        size={36}
      />
    ),
    // 打字机切片 + Markdown 实时渲染；content 增长由 onUpdate 持续驱动。
    contentRender: (content) => {
      if (typeof content !== 'string' || !content) return content;
      return <TypingMarkdown content={content} />;
    },
  },
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '未知请求错误';

const XoneChatStreamDebugPage = () => {
  const { styles } = useStyles();
  const { message: messageApi } = App.useApp();
  const abortRef = useRef<(() => void) | undefined>(undefined);
  const [agentId, setAgentId] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [knowledgeBaseId, setKnowledgeBaseId] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  /** 请求配置卡片默认折叠，点击“展开/收起”切换。 */
  const [configExpanded, setConfigExpanded] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [messages, setMessages] = useState<BubbleItemType[]>([]);
  const [senderValue, setSenderValue] = useState('你的模型和参数');
  const [status, setStatus] = useState('未连接');

  const hasAccessToken = Boolean(getAccessToken());

  const appendLog = (content: string) =>
    setLogs((current) => [
      ...current.slice(-499),
      `${new Date().toLocaleTimeString('zh-CN', { hour12: false })} ${content}`,
    ]);

  const updateAssistant = (key: string, update: Partial<BubbleItemType>) =>
    setMessages((current) =>
      current.map((item) => (item.key === key ? { ...item, ...update } : item)),
    );

  useEffect(
    () => () => {
      abortRef.current?.();
    },
    [],
  );

  const handleSubmit = (rawMessage: string) => {
    const submittedMessage = rawMessage.trim();
    if (!submittedMessage || isStreaming) return;

    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    let receivedText = '';
    let opened = false;
    const accessToken = getAccessToken();
    setIsStreaming(true);
    setStatus('正在连接');
    setMessages((current) => [
      ...current,
      {
        key: userMessageId,
        role: 'user',
        content: submittedMessage,
        status: 'local',
      },
      {
        key: assistantMessageId,
        role: 'ai',
        content: '',
        status: 'updating',
        loading: true,
      },
    ]);
    setSenderValue('');
    appendLog(`POST ${ENDPOINT}`);

    const request = XRequest<XoneChatRequest, SSEOutput>(ENDPOINT, {
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      manual: true,
      callbacks: {
        onUpdate: (chunk, headers) => {
          if (!opened) {
            opened = true;
            setStatus('接收中');
            appendLog(`HTTP 200 ${headers.get('content-type') ?? ''}`.trim());
          }
          appendLog(JSON.stringify(chunk));
          if (typeof chunk.data !== 'string' || !chunk.data) return;
          receivedText += chunk.data;
          updateAssistant(assistantMessageId, {
            content: receivedText,
            loading: false,
            status: 'updating',
          });
        },
        onSuccess: () => {
          setIsStreaming(false);
          setStatus('连接已关闭');
          appendLog('Connection closed');
          updateAssistant(assistantMessageId, {
            content: receivedText,
            loading: false,
            status: 'success',
          });
          abortRef.current = undefined;
        },
        onError: (error) => {
          const aborted = error.name === 'AbortError';
          const errorMessage = aborted ? '请求已中止' : getErrorMessage(error);
          setIsStreaming(false);
          setStatus(aborted ? '已中止' : '请求失败');
          appendLog(errorMessage);
          updateAssistant(assistantMessageId, {
            content: receivedText || errorMessage,
            loading: false,
            status: aborted ? 'abort' : 'error',
          });
          abortRef.current = undefined;
          if (!aborted) messageApi.error(errorMessage);
        },
      },
    });

    abortRef.current = () => request.abort();
    request.run({
      agentId,
      conversationId,
      knowledgeBaseId,
      message: submittedMessage,
    });
  };

  const renderedLogs = logs.length ? logs.join('\n') : '尚未发起请求。';

  return (
    <PageContainer
      title="XOne Chat Test"
      // subTitle="仅验证 POST 流式接口，不依赖会话列表和历史接口"
    >
      <div className={styles.page}>
        <Alert
          className={styles.notice}
          showIcon
          type={hasAccessToken ? 'info' : 'warning'}
          title={hasAccessToken ? '已检测到登录 Token' : '未检测到登录 Token'}
          description={
            hasAccessToken
              ? '请求将通过 /web 开发代理发送，并自动携带 Bearer Token。可选字段留空时不会出现在请求体中。'
              : '请先使用 XOne 登录链路登录，否则接口可能返回 401。'
          }
        />

        <div className={styles.grid}>
          <Card className={styles.chatCard} title="流式对话">
            <div className={styles.chatBody}>
              <div className={styles.messages}>
                {messages.length ? (
                  <Bubble.List autoScroll items={messages} role={bubbleRoles} />
                ) : (
                  <div className={styles.empty}>
                    <div>
                      <RobotFilled />
                      <p>发送一条消息开始验证流式输出</p>
                    </div>
                  </div>
                )}
              </div>
              <Sender
                autoSize={{ minRows: 2, maxRows: 6 }}
                className={styles.sender}
                loading={isStreaming}
                placeholder="输入消息，按 Enter 发送"
                styles={{ input: { outline: 'none' } }}
                value={senderValue}
                onCancel={() => abortRef.current?.()}
                onChange={setSenderValue}
                onSubmit={handleSubmit}
              />
            </div>
          </Card>

          <Card className={styles.logs} title="原始流日志（最近 500 条）">
            <pre className={styles.logOutput}>{renderedLogs}</pre>
          </Card>

          <Card
            title="请求配置"
            extra={
              <span className="flex items-center gap-2">
                <Tag>{status}</Tag>
                <Button
                  size="small"
                  type="text"
                  onClick={() => setConfigExpanded((current) => !current)}
                >
                  {configExpanded ? '收起' : '展开'}
                </Button>
              </span>
            }
          >
            {configExpanded ? (
              <div className={styles.configuration}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Endpoint</span>
                  <code className={styles.endpoint}>{ENDPOINT}</code>
                </div>
                <label className={styles.field} htmlFor="xone-conversation-id">
                  <span className={styles.fieldLabel}>
                    conversationId（可选）
                  </span>
                  <Input
                    allowClear
                    disabled={isStreaming}
                    id="xone-conversation-id"
                    placeholder="留空时由后端自动创建"
                    value={conversationId}
                    onChange={(event) => setConversationId(event.target.value)}
                  />
                </label>
                <label
                  className={styles.field}
                  htmlFor="xone-knowledge-base-id"
                >
                  <span className={styles.fieldLabel}>
                    knowledgeBaseId（可选）
                  </span>
                  <Input
                    allowClear
                    disabled={isStreaming}
                    id="xone-knowledge-base-id"
                    placeholder="留空时不启用知识库"
                    value={knowledgeBaseId}
                    onChange={(event) => setKnowledgeBaseId(event.target.value)}
                  />
                </label>
                <label className={styles.field} htmlFor="xone-agent-id">
                  <span className={styles.fieldLabel}>agentId（可选）</span>
                  <Input
                    allowClear
                    disabled={isStreaming}
                    id="xone-agent-id"
                    placeholder="留空时使用默认模型"
                    value={agentId}
                    onChange={(event) => setAgentId(event.target.value)}
                  />
                </label>
                <div className={styles.actions}>
                  <Button
                    disabled={isStreaming}
                    onClick={() => {
                      setConversationId('');
                      setMessages([]);
                      setStatus('未连接');
                    }}
                  >
                    新建本地会话
                  </Button>
                  <Button disabled={isStreaming} onClick={() => setLogs([])}>
                    清空日志
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};

export default XoneChatStreamDebugPage;
