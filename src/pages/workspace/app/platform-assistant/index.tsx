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
  type XModelParams,
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
  useRef,
  useState,
} from 'react';
import WorkspacePage from '@/components/WorkspacePage';
import { tagColors } from '@/theme/statusColors';
import { resolveWorkspaceScopeFromPath } from '@/utils/workspaceRoutes';
import { buildWorkspaceScopeKey } from '@/utils/workspaceState';
import { createPaiChatProvider } from './provider';
import { selectCitedMessageSources } from './sourceProtocol';
import {
  buildPaiStorageKey,
  createPaiConversation,
  loadPaiWorkspaceState,
  savePaiWorkspaceState,
  toPaiConversation,
  toPaiDefaultMessages,
} from './storage';
import usePlatformAssistantStyles from './style';
import type {
  PaiChatMessage,
  PaiConversation,
  PaiWorkspaceState,
} from './types';

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
  storageKey: string;
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

const PaiWorkbench = ({ storageKey, userName }: PaiWorkbenchProps) => {
  const { styles } = usePlatformAssistantStyles();
  const { token } = theme.useToken();
  const { modal } = App.useApp();
  const [initialWorkspaceState] = useState(() =>
    loadPaiWorkspaceState(storageKey),
  );
  const [senderValue, setSenderValue] = useState('');
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
  /**
   * 该 Map 只保存页面启动时从 localStorage 读取的快照，
   * 新建 X SDK 消息 Store 时通过 defaultMessages 恢复一次，不参与运行期状态管理。
   */
  const persistedMessagesByConversationRef = useRef(
    new Map<string, MessageInfo<PaiChatMessage>[]>(
      initialWorkspaceState.conversations.map(({ key, messages }) => [
        key,
        messages,
      ]),
    ),
  );

  const {
    conversations: sdkConversations,
    activeConversationKey,
    setActiveConversationKey,
    addConversation,
    removeConversation,
    setConversation,
    setConversations,
    getMessages: getSdkMessages,
  } = useXConversations({
    defaultConversations:
      initialWorkspaceState.conversations.map(toPaiConversation),
    defaultActiveConversationKey: initialWorkspaceState.activeConversationKey,
  });
  const conversations = sdkConversations as PaiConversation[];
  const activeConversation = conversations.find(
    ({ key }) => key === activeConversationKey,
  );
  const provider = useMemo(createPaiChatProvider, []);
  const getDefaultMessages = useCallback(
    ({ conversationKey }: { conversationKey?: string } = {}) =>
      conversationKey
        ? toPaiDefaultMessages(
            persistedMessagesByConversationRef.current.get(conversationKey) ??
              [],
          )
        : [],
    [],
  );
  const {
    abort,
    isDefaultMessagesRequesting,
    isRequesting,
    messages,
    onRequest,
  } = useXChat<PaiChatMessage, PaiChatMessage, XModelParams>({
    provider,
    conversationKey: activeConversationKey,
    defaultMessages: getDefaultMessages,
    requestPlaceholder: createRequestPlaceholder,
  });

  /**
   * 核心持久化链路：
   * useXConversations 元数据 + getMessages() 读取的 X SDK 消息 Store
   * -> 短暂防抖 -> 用户与 Scope 专属 localStorage Key。
   *
   * 删除会话后 conversations 会变化；此处只遍历剩余会话并覆盖整个快照，
   * 因此被删除会话的元数据和消息不会再次写入 localStorage。
   */
  useEffect(() => {
    if (isDefaultMessagesRequesting) return;

    const timer = setTimeout(() => {
      const workspaceState: PaiWorkspaceState = {
        version: 1,
        activeConversationKey,
        conversations: conversations.map((conversation) => ({
          ...conversation,
          messages:
            (getSdkMessages(conversation.key) as
              | MessageInfo<PaiChatMessage>[]
              | undefined) ??
            persistedMessagesByConversationRef.current.get(conversation.key) ??
            [],
        })),
      };
      savePaiWorkspaceState(storageKey, workspaceState);
    }, 160);
    return () => clearTimeout(timer);
  }, [
    activeConversationKey,
    conversations,
    getSdkMessages,
    isDefaultMessagesRequesting,
    messages,
    storageKey,
  ]);

  const sendMessage = (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || !activeConversation || isRequesting) return;

    const now = new Date().toISOString();
    const updatedConversation: PaiConversation = {
      ...activeConversation,
      label: activeConversation.isDraft
        ? createConversationTitle(question)
        : activeConversation.label,
      isDraft: false,
      updatedAt: now,
    };
    // 最近产生内容的会话置顶，让 Conversations 顺序与用户心智一致。
    setConversations([
      updatedConversation,
      ...conversations.filter(({ key }) => key !== activeConversation.key),
    ]);
    setSenderValue('');
    setCapabilityPopoverOpen(false);

    /**
     * 核心消息链路：
     * Sender -> useXChat.onRequest -> PaiChatProvider -> XRequest 请求本站后端
     * -> pAI Agent -> 项目 SSE -> useXChat 更新状态 -> Bubble.List 渲染。
     */
    onRequest({
      ...(knowledgeEnabled ? { knowledgeEnabled: true } : {}),
      ...(webSearchEnabled ? { webSearchEnabled: true } : {}),
      messages: [{ role: 'user', content: question }],
    });
  };

  const createConversation = () => {
    if (isRequesting) return;

    const currentMessages =
      (getSdkMessages(activeConversationKey) as
        | MessageInfo<PaiChatMessage>[]
        | undefined) ??
      persistedMessagesByConversationRef.current.get(activeConversationKey) ??
      [];
    if (activeConversation?.isDraft && currentMessages.length === 0) {
      setConversationDrawerOpen(false);
      return;
    }

    const storedConversation = createPaiConversation();
    addConversation(toPaiConversation(storedConversation), 'prepend');
    setActiveConversationKey(storedConversation.key);
    setSenderValue('');
    setConversationDrawerOpen(false);
  };

  const deleteConversation = (conversationKey: string) => {
    if (isRequesting) return;

    // 先计算删除后的列表，用于选择新的激活会话或补建一个空白会话。
    const remainingConversations = conversations.filter(
      ({ key }) => key !== conversationKey,
    );
    // 更新 useXConversations 内存状态；随后由上方持久化 effect 覆盖 localStorage。
    removeConversation(conversationKey);

    if (remainingConversations.length === 0) {
      // 工作台始终至少保留一个可输入的会话，删除最后一个时立即创建草稿。
      const storedConversation = createPaiConversation();
      addConversation(toPaiConversation(storedConversation), 'prepend');
      setActiveConversationKey(storedConversation.key);
      return;
    }
    if (activeConversationKey === conversationKey) {
      setActiveConversationKey(remainingConversations[0].key);
    }
  };

  const confirmDeleteConversation = (conversationKey: string) => {
    if (isRequesting) return;
    modal.confirm({
      title: '删除此会话？',
      content: '该会话只保存在当前浏览器，删除后无法恢复。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => deleteConversation(conversationKey),
    });
  };

  const openRenameConversation = (conversationKey: string) => {
    if (isRequesting) return;
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

  const saveConversationTitle = () => {
    if (!renameConversationState) return;

    // 与首次提问自动命名共用清洗规则：压缩空白并限制为 24 个字符。
    const label = createConversationTitle(renameConversationState.title);
    if (!label) return;

    const conversation = conversations.find(
      ({ key }) => key === renameConversationState.conversationKey,
    );
    if (conversation) {
      /**
       * 只更新会话元数据，不改变 key、消息或排序时间。
       * isDraft=false 表示标题已由用户确认，避免首次提问再次自动覆盖标题；
       * conversations 变化后由持久化 effect 自动写入 localStorage。
       */
      setConversation(conversation.key, {
        ...conversation,
        label,
        isDraft: false,
      });
    }
    setRenameConversationState(undefined);
  };

  const switchConversation = (conversationKey: string) => {
    if (isRequesting || conversationKey === activeConversationKey) {
      setConversationDrawerOpen(false);
      return;
    }
    setActiveConversationKey(conversationKey);
    setSenderValue('');
    setConversationDrawerOpen(false);
  };

  const conversationItems = conversations.map((conversation) => ({
    key: conversation.key,
    label: conversation.label,
    group: getConversationGroup(conversation.updatedAt),
    disabled: isRequesting && conversation.key !== activeConversationKey,
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
        contentRender: (content: string, info) =>
          content ? (
            <MessageUpdatingContext.Provider
              value={isResponseUpdating(info.status)}
            >
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
            </MessageUpdatingContext.Provider>
          ) : undefined,
      },
    }),
    [userInitial],
  );

  const bubbleItems = useMemo<BubbleItemType[]>(
    () =>
      messages.map(({ id, message, status }) => {
        // Sources 只在回答完成后展示，避免流式过程中引用数量跳动；
        // 原始候选来源仍保留在消息中，便于持久化与后续审计。
        const citedSources =
          status === 'success'
            ? selectCitedMessageSources(message.content, message.sources)
            : [];

        return {
          key: id,
          role: message.role,
          content: message.content,
          status,
          loading:
            message.role === 'assistant' &&
            !message.content &&
            (status === 'loading' || status === 'updating'),
          streaming: isResponseUpdating(status),
          footer:
            status === 'abort' ? (
              <Typography.Text type="secondary">回复已停止</Typography.Text>
            ) : status === 'error' ? (
              <Typography.Text type="danger">回复生成失败</Typography.Text>
            ) : citedSources.length ? (
              <Sources
                defaultExpanded={false}
                items={citedSources.map((source) => ({
                  key: source.sourceId,
                  title: `${source.title}（${source.sourceId}）`,
                  url: source.sourceUrl,
                }))}
                title={`参考资料（${citedSources.length}）`}
              />
            ) : undefined,
        };
      }),
    [messages],
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
        disabled: isRequesting,
        label: '新建对话',
        onClick: createConversation,
      }}
      menu={(conversation) => ({
        items: [
          {
            key: 'rename',
            disabled: isRequesting,
            icon: <EditOutlined />,
            label: '重命名',
          },
          {
            key: 'delete',
            danger: true,
            disabled: isRequesting,
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
              <p className={styles.sidebarDescription}>仅保存在当前浏览器</p>
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
                loading={isRequesting}
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
                              disabled={isRequesting}
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
                              disabled={isRequesting}
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
                          disabled={isRequesting}
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
                          disabled={isRequesting}
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
                          disabled={isRequesting}
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

const PlatformAssistantPage = () => {
  const { pathname } = useLocation();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const scope =
    resolveWorkspaceScopeFromPath(pathname) ?? ({ kind: 'platform' } as const);
  const scopeKey = buildWorkspaceScopeKey(scope);
  /**
   * storageKey 是本地会话隔离边界：
   * currentUser.userId 防止同一浏览器的不同账号串话，scopeKey 防止 Platform/Organization 串话。
   */
  const storageKey = buildPaiStorageKey(
    currentUser?.userId ?? 'local-preview',
    scopeKey,
  );

  return (
    <WorkspacePage
      // actions={
      //   <Tag color="blue" variant="outlined">
      //     DeepSeek
      //   </Tag>
      // }
      breadcrumb={['应用', 'pAI']}
      description=""
      title="pAI"
    >
      <PaiWorkbench
        key={storageKey}
        storageKey={storageKey}
        userName={currentUser?.name}
      />
    </WorkspacePage>
  );
};

export default PlatformAssistantPage;
