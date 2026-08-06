import {
  CheckOutlined,
  CloseOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  FileSearchOutlined,
  GlobalOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  OllamaFilled,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  Bubble,
  type BubbleItemType,
  type BubbleListProps,
  Conversations,
  Prompts,
  type PromptsItemType,
  Sender,
  Sources,
  Think,
} from '@ant-design/x';
import XMarkdown, { type ComponentProps } from '@ant-design/x-markdown';
import {
  type MessageInfo,
  useXChat,
  useXConversations,
} from '@ant-design/x-sdk';
import { useLocation, useModel } from '@umijs/max';
import {
  App,
  Avatar,
  Button,
  Drawer,
  Input,
  Layout,
  Modal,
  Popover,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import {
  type CSSProperties,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { tagColors } from '@/theme/statusColors';
import { resolveWorkspaceScopeFromPath } from '@/utils/workspaceRoutes';
import type { WorkspaceScope } from '@/utils/workspaceState';
import { buildWorkspaceScopeKey } from '@/utils/workspaceState';
import {
  createPaiChatProvider,
  createPaiRequestFallback,
  findRetryQuestion,
} from './provider';
import {
  clearLegacyPaiStorage,
  createPaiConversation,
  deletePaiConversation,
  getPaiConversationHistory,
  listPaiConversations,
  toPaiConversation,
  toPaiDefaultMessages,
  updatePaiConversationTitle,
} from './service';
import { selectCitedMessageSources } from './sourceProtocol';
import useAiAssistantStyles from './style';
import type { PaiChatMessage, PaiConversation, PaiRunRequest } from './types';

const STREAMING_ACTIVE = { hasNextChunk: true, enableAnimation: true };
const STREAMING_IDLE = { hasNextChunk: false, enableAnimation: false };
const CONVERSATION_SIDEBAR_WIDTH = 234;
const { Sider } = Layout;

export const isResponseUpdating = (
  status: MessageInfo<PaiChatMessage>['status'] | undefined,
) => status === 'updating';

/**
 * PaiChatProvider 会把 reasoning-delta 事件包装成 <think>。
 * Think 的加载状态以 useXChat 消息状态为准，避免请求 abort 后未闭合的
 * <think> 标签继续让 XMarkdown 显示“思考中”。
 */
const MessageUpdatingContext = createContext(false);
const PaiThink = ({ children }: ComponentProps) => {
  const isThinking = useContext(MessageUpdatingContext);
  return (
    <Think
      defaultExpanded={false}
      loading={isThinking}
      title={isThinking ? '思考中' : '思考过程'}
    >
      {children}
    </Think>
  );
};
const MARKDOWN_COMPONENTS = { think: PaiThink };

const promptTextByKey = {
  'risk-review': '帮我检查一段内容中的逻辑风险，并按严重程度给出修改建议。',
  'review-list': '为一份业务合同整理一份通用审查清单。',
  ambiguity: '如何识别文本中的表述歧义、责任缺口和缺失条件？',
} as const;

const promptItems: PromptsItemType[] = [
  {
    key: 'risk-review',
    icon: <SafetyCertificateOutlined />,
    label: '审查逻辑风险',
    description: '识别矛盾、遗漏与不可执行表述',
  },
  {
    key: 'review-list',
    icon: <FileSearchOutlined />,
    label: '生成审查清单',
    description: '按目标和场景整理检查项',
  },
  {
    key: 'ambiguity',
    icon: <OllamaFilled />,
    label: '分析表述歧义',
    description: '检查责任边界和前置条件',
  },
];

type PaiWorkbenchProps = {
  scope: WorkspaceScope;
  userName?: string;
};

type RenameConversationState = {
  /** 当前准备改名的会话标识，用于提交时定位 SDK 会话。 */
  conversationKey: string;
  /** 输入框中的临时标题；保存前不会修改会话列表。 */
  title: string;
};

const getConversationGroup = (updatedAt: string) => {
  const updatedDate = new Date(updatedAt);
  const today = new Date();
  const dayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const updatedDayStart = new Date(
    updatedDate.getFullYear(),
    updatedDate.getMonth(),
    updatedDate.getDate(),
  ).getTime();
  const dayDifference = Math.round(
    (dayStart - updatedDayStart) / (24 * 60 * 60 * 1000),
  );

  if (dayDifference <= 0) return '今天';
  if (dayDifference === 1) return '昨天';
  return '更早';
};

export const createConversationTitle = (question: string) => {
  const normalizedQuestion = question.replace(/\s+/g, ' ').trim();
  return normalizedQuestion.length > 24
    ? `${normalizedQuestion.slice(0, 24)}…`
    : normalizedQuestion;
};

const createRequestPlaceholder = (): PaiChatMessage => ({
  role: 'assistant',
  content: '',
});

const PaiWorkbench = ({ scope, userName }: PaiWorkbenchProps) => {
  const { styles } = useAiAssistantStyles();
  const { token } = theme.useToken();
  const { message: messageApi, modal } = App.useApp();
  const [senderValue, setSenderValue] = useState('');
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(true);
  const [isConversationMutation, setIsConversationMutation] = useState(false);
  /**
   * 知识库模式是本次请求的后端编排开关，不写入消息历史。
   * sendMessage 会把启用状态复制到顶层请求参数，关闭时则省略该字段。
   */
  const [knowledgeEnabled, setKnowledgeEnabled] = useState(false);
  /**
   * Web Search 与知识库是可同时启用的请求能力。
   * 和 knowledgeEnabled 一样，它属于请求编排状态，不混入消息历史。
   */
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [capabilityPopoverOpen, setCapabilityPopoverOpen] = useState(false);
  const [conversationDrawerOpen, setConversationDrawerOpen] = useState(false);
  // 仅控制桌面端 Layout.Sider；移动端继续通过 Drawer 管理会话列表。
  const [conversationSidebarCollapsed, setConversationSidebarCollapsed] =
    useState(false);
  // 重命名弹窗的临时表单状态；undefined 表示弹窗关闭。
  const [renameConversationState, setRenameConversationState] =
    useState<RenameConversationState>();

  const {
    conversations: sdkConversations,
    activeConversationKey,
    setActiveConversationKey,
    addConversation,
    removeConversation,
    setConversation,
    setConversations,
  } = useXConversations({
    defaultConversations: [],
    defaultActiveConversationKey: '',
  });
  const conversations = sdkConversations as PaiConversation[];
  const activeConversation = conversations.find(
    ({ key }) => key === activeConversationKey,
  );
  const provider = useMemo(
    () =>
      activeConversationKey
        ? createPaiChatProvider(activeConversationKey)
        : undefined,
    [activeConversationKey],
  );
  const getDefaultMessages = useCallback(
    async ({ conversationKey }: { conversationKey?: string } = {}) => {
      if (!conversationKey) return [];

      try {
        // 每个 X SDK Store 首次创建时直接读取 MySQL History，不经过前端快照层。
        const { data: history } =
          await getPaiConversationHistory(conversationKey);
        return toPaiDefaultMessages(history);
      } catch (error) {
        messageApi.error('会话历史加载失败，请稍后重试');
        throw error;
      }
    },
    [messageApi],
  );
  const {
    abort,
    isDefaultMessagesRequesting,
    isRequesting,
    messages,
    onRequest,
    queueRequest,
    setMessages,
  } = useXChat<PaiChatMessage, PaiChatMessage, PaiRunRequest>({
    provider,
    conversationKey: activeConversationKey,
    defaultMessages: getDefaultMessages,
    requestFallback: createPaiRequestFallback,
    requestPlaceholder: createRequestPlaceholder,
  });
  const isBusy =
    isWorkspaceLoading ||
    isConversationMutation ||
    isDefaultMessagesRequesting ||
    isRequesting;

  /**
   * 页面启动只读取会话列表；激活会话的 History 由 useXChat.defaultMessages
   * 按 conversationKey 异步加载。旧 pai:v1:* 数据按产品决定直接清除，
   * 不迁移、不作为接口失败时的历史兜底。
   */
  useEffect(() => {
    let cancelled = false;

    const loadWorkspace = async () => {
      setIsWorkspaceLoading(true);
      try {
        clearLegacyPaiStorage();
        const { data: summaries } = await listPaiConversations(scope);
        if (cancelled) return;

        const loadedConversations = summaries.map(toPaiConversation);
        const firstConversation = loadedConversations[0];
        setConversations(loadedConversations);
        setActiveConversationKey(firstConversation?.key ?? '');
      } catch {
        if (!cancelled) messageApi.error('会话加载失败，请稍后重试');
      } finally {
        if (!cancelled) setIsWorkspaceLoading(false);
      }
    };

    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [messageApi, scope, setActiveConversationKey, setConversations]);

  const buildRunRequest = useCallback(
    (question: string): PaiRunRequest => ({
      // 每次点击发送都生成独立幂等键；网络重试可复用同一请求对象。
      idempotencyKey: crypto.randomUUID(),
      messages: [{ role: 'user', content: question }],
      ...(knowledgeEnabled ? { knowledgeEnabled: true } : {}),
      ...(webSearchEnabled ? { webSearchEnabled: true } : {}),
    }),
    [knowledgeEnabled, webSearchEnabled],
  );

  const sendMessage = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || isBusy) return;

    setIsConversationMutation(true);
    try {
      const requestParams = buildRunRequest(question);
      let requestConversation = activeConversation;

      if (!requestConversation) {
        // 空工作台首次发送时先创建后端会话，再由 queueRequest 等待 SDK 切换完成。
        const { data: created } = await createPaiConversation(
          scope,
          createConversationTitle(question),
        );
        requestConversation = toPaiConversation(created);
        addConversation(requestConversation, 'prepend');
        setActiveConversationKey(requestConversation.key);
        queueRequest(requestConversation.key, requestParams);
      } else {
        let updatedConversation = requestConversation;
        if (requestConversation.label === '新对话' && messages.length === 0) {
          const { data: renamed } = await updatePaiConversationTitle(
            requestConversation.key,
            createConversationTitle(question),
          );
          updatedConversation = toPaiConversation(renamed);
          setConversation(updatedConversation.key, updatedConversation);
        }

        // 后端 updatedAt 会在 Run 写入时更新；这里先把当前会话置顶，随后刷新仍以后端为准。
        setConversations([
          updatedConversation,
          ...conversations.filter(({ key }) => key !== updatedConversation.key),
        ]);
        onRequest(requestParams);
      }

      setSenderValue('');
      setCapabilityPopoverOpen(false);
    } catch {
      messageApi.error('消息发送失败，请稍后重试');
    } finally {
      setIsConversationMutation(false);
    }
  };

  const handleCreateConversation = async () => {
    if (isBusy) return;
    if (activeConversation?.label === '新对话' && messages.length === 0) {
      setConversationDrawerOpen(false);
      return;
    }

    setIsConversationMutation(true);
    try {
      const { data: created } = await createPaiConversation(scope, '新对话');
      const conversation = toPaiConversation(created);
      addConversation(conversation, 'prepend');
      setActiveConversationKey(conversation.key);
      setSenderValue('');
      setConversationDrawerOpen(false);
    } catch {
      messageApi.error('新建会话失败，请稍后重试');
    } finally {
      setIsConversationMutation(false);
    }
  };

  const handleDeleteConversation = async (conversationKey: string) => {
    if (isBusy) return;

    setIsConversationMutation(true);
    try {
      await deletePaiConversation(conversationKey);
      const remainingConversations = conversations.filter(
        ({ key }) => key !== conversationKey,
      );
      removeConversation(conversationKey);

      if (activeConversationKey === conversationKey) {
        const nextConversation = remainingConversations[0];
        if (nextConversation) {
          setActiveConversationKey(nextConversation.key);
        } else {
          // 删除最后一条后保持真正的空工作台；首次发送时再创建后端记录。
          setActiveConversationKey('');
          setMessages([]);
        }
      }
    } catch {
      messageApi.error('删除会话失败，请稍后重试');
    } finally {
      setIsConversationMutation(false);
    }
  };

  const confirmDeleteConversation = (conversationKey: string) => {
    if (isBusy) return;
    modal.confirm({
      title: '删除此会话？',
      content: '会话及其消息将从服务器永久删除，删除后无法恢复。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => handleDeleteConversation(conversationKey),
    });
  };

  const openRenameConversation = (conversationKey: string) => {
    if (isBusy) return;
    // 菜单项只有通用会话字段，这里通过 key 取得完整的业务会话数据。
    const conversation = conversations.find(
      ({ key }) => key === conversationKey,
    );
    if (!conversation) return;

    setRenameConversationState({
      conversationKey: conversation.key,
      title: conversation.label,
    });
  };

  const saveConversationTitle = async () => {
    if (!renameConversationState) return;

    // 与首次提问自动命名共用清洗规则：压缩空白并限制为 24 个字符。
    const label = createConversationTitle(renameConversationState.title);
    if (!label) return;

    setIsConversationMutation(true);
    try {
      // 标题由后端清洗并返回 authoritative updatedAt，前端只投影响应结果。
      const { data: updated } = await updatePaiConversationTitle(
        renameConversationState.conversationKey,
        label,
      );
      const conversation = toPaiConversation(updated);
      setConversation(conversation.key, conversation);
      setRenameConversationState(undefined);
    } catch {
      messageApi.error('重命名会话失败，请稍后重试');
    } finally {
      setIsConversationMutation(false);
    }
  };

  const switchConversation = (conversationKey: string) => {
    if (isBusy || conversationKey === activeConversationKey) {
      setConversationDrawerOpen(false);
      return;
    }

    // conversationKey 变化后，useXChat 会创建 Store 并调用异步 defaultMessages。
    setActiveConversationKey(conversationKey);
    setSenderValue('');
    setConversationDrawerOpen(false);
  };

  const conversationItems = conversations.map((conversation) => ({
    key: conversation.key,
    label: conversation.label,
    group: getConversationGroup(conversation.updatedAt),
    disabled: isBusy && conversation.key !== activeConversationKey,
  }));

  const userInitial = userName?.trim()
    ? Array.from(userName.trim())[0]?.toLocaleUpperCase()
    : '我';
  const roleConfig = useMemo<BubbleListProps['role']>(
    () => ({
      user: {
        placement: 'end',
        avatar: <Avatar>{userInitial}</Avatar>,
      },
      assistant: {
        placement: 'start',
        avatar: <Avatar icon={<OllamaFilled />} />,
        contentRender: (content: string, info) => {
          const errorMessage =
            typeof info.extraInfo?.errorMessage === 'string'
              ? info.extraInfo.errorMessage
              : undefined;
          return content || errorMessage ? (
            <MessageUpdatingContext.Provider
              value={isResponseUpdating(info.status)}
            >
              {content ? (
                <XMarkdown
                  components={MARKDOWN_COMPONENTS}
                  streaming={
                    isResponseUpdating(info.status)
                      ? STREAMING_ACTIVE
                      : STREAMING_IDLE
                  }
                >
                  {content}
                </XMarkdown>
              ) : null}
              {errorMessage ? (
                <Typography.Text
                  className={styles.failureMessage}
                  type="danger"
                >
                  {errorMessage}
                </Typography.Text>
              ) : null}
            </MessageUpdatingContext.Provider>
          ) : undefined;
        },
      },
    }),
    [styles.failureMessage, userInitial],
  );

  const bubbleItems: BubbleItemType[] = messages.map(
    ({ id, message, status }, messageIndex) => {
      // Sources 只在回答完成后展示，避免流式过程中引用数量跳动；
      // 原始候选来源仍保留在消息中，便于持久化与后续审计。
      const citedSources =
        status === 'success' && message.terminalStatus !== 'failed'
          ? selectCitedMessageSources(message.content, message.sources)
          : [];
      // Run 的 error/done 事件位于成功建立的 SSE 响应中，不能只看 SDK HTTP 状态。
      const isAborted =
        status === 'abort' || message.terminalStatus === 'aborted';
      const isFailed =
        status === 'error' || message.terminalStatus === 'failed';
      const retryQuestion = isFailed
        ? findRetryQuestion(messages, messageIndex)
        : undefined;

      return {
        key: id,
        role: message.role,
        content: message.content,
        status,
        extraInfo:
          isFailed && message.errorMessage
            ? { errorMessage: message.errorMessage }
            : undefined,
        styles: isFailed ? { extra: { alignSelf: 'center' } } : undefined,
        loading:
          message.role === 'assistant' &&
          !message.content &&
          (status === 'loading' || status === 'updating'),
        streaming: isResponseUpdating(status),
        extra:
          isFailed && message.errorMessage ? (
            <Button
              color="danger"
              disabled={isBusy || !retryQuestion}
              icon={<ReloadOutlined />}
              size="small"
              variant="text"
              onClick={() => {
                if (retryQuestion) void sendMessage(retryQuestion);
              }}
            >
              重试
            </Button>
          ) : undefined,
        footer: isAborted ? (
          <Typography.Text type="secondary">回复已停止</Typography.Text>
        ) : citedSources.length ? (
          <Sources
            defaultExpanded={false}
            items={citedSources.map((source) => ({
              icon: <span aria-hidden className={styles.sourceDot} />,
              key: source.sourceId,
              title: `${source.title}（${source.sourceId}）`,
              url: source.sourceUrl,
            }))}
            title={`参考资料（${citedSources.length}）`}
          />
        ) : undefined,
      };
    },
  );
  const hasMessages = bubbleItems.length > 0;

  const conversationList = (
    <Conversations
      className={styles.conversations}
      items={conversationItems}
      activeKey={activeConversationKey}
      groupable={{
        collapsible: true,
        defaultExpandedKeys: ['今天'],
      }}
      styles={{ creation: { border: 'none' } }}
      creation={{
        disabled: isBusy,
        label: '新建对话',
        onClick: handleCreateConversation,
      }}
      menu={(conversation) => ({
        items: [
          {
            key: 'rename',
            disabled: isBusy,
            icon: <EditOutlined />,
            label: '重命名',
          },
          {
            key: 'delete',
            danger: true,
            disabled: isBusy,
            icon: <DeleteOutlined />,
            label: '删除',
          },
        ],
        onClick: ({ key, domEvent }) => {
          domEvent.stopPropagation();
          if (key === 'rename') openRenameConversation(conversation.key);
          if (key === 'delete') confirmDeleteConversation(conversation.key);
        },
      })}
      onActiveChange={switchConversation}
    />
  );

  return (
    <>
      <section aria-label="pAI 对话工作台" className={styles.workbench}>
        <Sider
          aria-label="会话列表"
          breakpoint="lg"
          className={styles.sidebar}
          collapsed={conversationSidebarCollapsed}
          collapsedWidth={0}
          collapsible
          style={
            {
              '--pai-conversation-sidebar-width': `${CONVERSATION_SIDEBAR_WIDTH}px`,
            } as CSSProperties
          }
          theme="light"
          trigger={null}
          width={CONVERSATION_SIDEBAR_WIDTH}
          // 低于 lg（992px）时由 Sider 原生响应式能力自动收起。
          onBreakpoint={setConversationSidebarCollapsed}
        >
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarHeaderContent}>
              <h2 className={styles.sidebarTitle}>会话</h2>
              <p className={styles.sidebarDescription}>已保存至你的账户</p>
            </div>
            <Tooltip title="收起会话栏">
              <Button
                aria-label="收起会话栏"
                icon={<MenuFoldOutlined />}
                type="text"
                onClick={() => setConversationSidebarCollapsed(true)}
              />
            </Tooltip>
          </div>
          {conversationList}
        </Sider>

        <div className={styles.main}>
          <header className={styles.mainHeader}>
            {conversationSidebarCollapsed ? (
              <Tooltip title="展开会话栏">
                <Button
                  aria-label="展开会话栏"
                  className={styles.desktopConversationButton}
                  icon={<MenuUnfoldOutlined />}
                  type="text"
                  onClick={() => setConversationSidebarCollapsed(false)}
                />
              </Tooltip>
            ) : null}
            <Button
              aria-label="打开会话列表"
              className={styles.mobileConversationButton}
              icon={<MenuOutlined />}
              onClick={() => setConversationDrawerOpen(true)}
            />
            <h2 className={styles.activeTitle}>
              {activeConversation?.label ?? '新对话'}
            </h2>
            {/*<Tag color="blue" variant="outlined">*/}
            {/*  通用审查*/}
            {/*</Tag>*/}
          </header>

          <div className={styles.messages}>
            {hasMessages ? (
              <Bubble.List autoScroll items={bubbleItems} role={roleConfig} />
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyContent}>
                  <span aria-hidden className={styles.emptyIcon}>
                    <OllamaFilled />
                  </span>
                  <h2 className={styles.emptyTitle}>从一个审查问题开始</h2>
                  <p className={styles.emptyDescription}>
                    pAI
                    可以帮助你梳理文本风险、检查逻辑缺口并形成可执行的修改建议。
                  </p>
                  <Prompts
                    fadeIn={false}
                    items={promptItems}
                    title="你可以这样提问"
                    wrap
                    onItemClick={({ data }) => {
                      const prompt =
                        promptTextByKey[
                          data.key as keyof typeof promptTextByKey
                        ];
                      if (prompt) sendMessage(prompt);
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <footer className={styles.senderArea}>
            <div className={styles.senderInner}>
              <Sender
                autoSize={{ minRows: 1, maxRows: 6 }}
                loading={isBusy}
                placeholder="随心输入"
                styles={{ input: { outline: 'none' } }}
                value={senderValue}
                onCancel={abort}
                onChange={setSenderValue}
                onSubmit={sendMessage}
                suffix={false}
                footer={(actions) => (
                  <div className={styles.senderFooter}>
                    <div className={styles.senderFooterStart}>
                      <Popover
                        content={
                          <div
                            aria-label="能力"
                            className={styles.capabilityOptions}
                            role="menu"
                          >
                            <button
                              aria-checked={knowledgeEnabled}
                              className={styles.capabilityOption}
                              disabled={isBusy}
                              role="menuitemcheckbox"
                              type="button"
                              onClick={() =>
                                setKnowledgeEnabled((enabled) => !enabled)
                              }
                            >
                              <DatabaseOutlined
                                aria-hidden
                                className={styles.capabilityOptionIcon}
                              />
                              <span className={styles.capabilityOptionTitle}>
                                使用知识库
                              </span>
                              {knowledgeEnabled ? (
                                <CheckOutlined
                                  aria-hidden
                                  className={styles.capabilityOptionCheck}
                                />
                              ) : null}
                            </button>
                            <button
                              aria-checked={webSearchEnabled}
                              className={styles.capabilityOption}
                              disabled={isBusy}
                              role="menuitemcheckbox"
                              type="button"
                              onClick={() =>
                                setWebSearchEnabled((enabled) => !enabled)
                              }
                            >
                              <GlobalOutlined
                                aria-hidden
                                className={styles.capabilityOptionIcon}
                              />
                              <span className={styles.capabilityOptionTitle}>
                                联网检索
                              </span>
                              {webSearchEnabled ? (
                                <CheckOutlined
                                  aria-hidden
                                  className={styles.capabilityOptionCheck}
                                />
                              ) : null}
                            </button>
                          </div>
                        }
                        open={capabilityPopoverOpen}
                        placement="topLeft"
                        styles={{
                          container: {
                            padding: 3,
                            background: token.colorBgElevated,
                            boxShadow: token.boxShadowSecondary,
                          },
                        }}
                        trigger="click"
                        onOpenChange={setCapabilityPopoverOpen}
                      >
                        <Button
                          aria-label="选择知识库或 Web Search"
                          className={styles.capabilityButton}
                          disabled={isBusy}
                          icon={<PlusOutlined />}
                          shape="circle"
                          type="text"
                        />
                      </Popover>

                      {/* 已启用能力紧邻入口展示；关闭标记会同步关闭下一次请求的对应能力。 */}
                      {knowledgeEnabled ? (
                        <Tag
                          className={styles.capabilityTag}
                          closeIcon={
                            <CloseOutlined aria-label="关闭知识库能力" />
                          }
                          disabled={isBusy}
                          icon={<DatabaseOutlined />}
                          style={{
                            backgroundColor: tagColors.knowledge.soft,
                            color: tagColors.knowledge.ink,
                          }}
                          variant="filled"
                          onClose={(event) => {
                            event.preventDefault();
                            setKnowledgeEnabled(false);
                          }}
                        >
                          知识库
                        </Tag>
                      ) : null}
                      {knowledgeEnabled && webSearchEnabled ? (
                        <span
                          aria-hidden
                          className={styles.capabilitySeparator}
                        >
                          ｜
                        </span>
                      ) : null}
                      {webSearchEnabled ? (
                        <Tag
                          className={styles.capabilityTag}
                          closeIcon={
                            <CloseOutlined aria-label="关闭联网检索能力" />
                          }
                          disabled={isBusy}
                          icon={<GlobalOutlined />}
                          style={{
                            backgroundColor: tagColors.webSearch.soft,
                            color: tagColors.webSearch.ink,
                          }}
                          variant="filled"
                          onClose={(event) => {
                            event.preventDefault();
                            setWebSearchEnabled(false);
                          }}
                        >
                          联网
                        </Tag>
                      ) : null}
                    </div>
                    {actions}
                  </div>
                )}
              />
              <p className={styles.disclaimer}>
                AI 生成内容可能不准确，请仔细甄别。
              </p>
            </div>
          </footer>
        </div>
      </section>

      <Drawer
        destroyOnHidden
        open={conversationDrawerOpen}
        placement="left"
        size={320}
        styles={{ body: { padding: 0 } }}
        title="pAI 会话"
        onClose={() => setConversationDrawerOpen(false)}
      >
        <div className={styles.drawerBody}>{conversationList}</div>
      </Drawer>

      <Modal
        cancelText="取消"
        confirmLoading={isConversationMutation}
        destroyOnHidden
        okButtonProps={{
          disabled: !renameConversationState?.title.trim(),
        }}
        okText="保存"
        open={Boolean(renameConversationState)}
        title="重命名会话"
        width={420}
        onCancel={() => setRenameConversationState(undefined)}
        onOk={saveConversationTitle}
      >
        <Input
          allowClear
          aria-label="会话标题"
          autoFocus
          maxLength={24}
          placeholder="输入会话标题"
          showCount
          value={renameConversationState?.title ?? ''}
          onChange={({ target }) =>
            setRenameConversationState((current) =>
              current ? { ...current, title: target.value } : current,
            )
          }
          onPressEnter={saveConversationTitle}
        />
      </Modal>
    </>
  );
};

const AiAssistantPage = () => {
  const { styles } = useAiAssistantStyles();
  const { pathname } = useLocation();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  // scope 既是后端隔离条件，也是整个工作台的 React key；路径变化时完整重建 Store。
  const scope = useMemo(
    () =>
      resolveWorkspaceScopeFromPath(pathname) ??
      ({ kind: 'platform' } as const),
    [pathname],
  );
  const scopeKey = buildWorkspaceScopeKey(scope);

  return (
    <section aria-label="pAI" className={styles.pageRoot}>
      <PaiWorkbench key={scopeKey} scope={scope} userName={currentUser?.name} />
    </section>
  );
};

export default AiAssistantPage;
