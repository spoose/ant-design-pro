import {
  BulbOutlined,
  CoffeeOutlined,
  FileTextOutlined,
  LoginOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Prompts, type PromptsItemType, Sender } from '@ant-design/x';
import { createAvatar } from '@bible-strong/avatar-react';
import { useNavigate } from '@umijs/max';
import { Button, Tag } from 'antd';
import { useState } from 'react';
import { statusColors } from '@/theme/statusColors';
import { getOctopInstanceName } from '@/utils/octopRuntime';
import { useOctopBridge } from '@/utils/useOctopBridge';
import { resolveWorkspaceScopeFromPath } from '@/utils/workspaceRoutes';
import '@bible-strong/avatar-react/styles.css';
import strobiDefinition from './strobi.avatar.json';

// 与「问问小One」使用同一头像，保持两张卡片的视觉一致。
const StrobiAvatar = createAvatar(strobiDefinition);

const promptItems: PromptsItemType[] = [
  {
    key: 'octop-knowledge',
    icon: <FileTextOutlined className="text-lg" style={{ color: '#13c2c2' }} />,
    label: '介绍一下聚数公司',
  },
  {
    key: 'octop-research',
    icon: (
      <CoffeeOutlined
        className="text-lg"
        style={{ color: statusColors.success.ink }}
      />
    ),
    label: '今日菜单',
  },
  {
    key: 'octop-draft',
    icon: <FileTextOutlined className="text-lg" style={{ color: '#1677ff' }} />,
    label: '帮我起草一份上会说明',
  },
  {
    key: 'octop-explain',
    icon: (
      <SearchOutlined
        className="text-lg"
        style={{ color: statusColors.warning.ink }}
      />
    ),
    label: '生成今日兰溪招投标信息简报',
  },
];

const statusTag = {
  unauthenticated: { color: 'default', text: '未登录' },
  offline: { color: 'warning', text: '服务不可用' },
} as const;

/**
 * 工作台「问问知识库助手」卡片：问候、输入和推荐问题，提问经 wujie 内嵌的 Octop 发送。
 * 启动时等待 Octop 自动校验登录，确认已登录后允许提问；未登录或服务异常时提供入口。
 */
export const PlatformOctopConversations = ({
  userId,
  userName,
  octopPath,
}: {
  userId?: string;
  userName?: string;
  /** 当前 Scope 下 Octop 页的路径（由 getAppPath('octop') 生成）。 */
  octopPath: string;
}) => {
  const navigate = useNavigate();
  const [senderValue, setSenderValue] = useState('');
  // 实例名由路径推导，与 octop 页使用的 scope 完全一致。
  const scope = resolveWorkspaceScopeFromPath(octopPath);
  const instanceName = getOctopInstanceName(userId, scope);
  const { status } = useOctopBridge(instanceName);
  const offline = status === 'offline';
  const checking = status === 'idle' || status === 'checking';
  const blocked = status !== 'authenticated';
  const badge =
    status === 'unauthenticated' || status === 'offline'
      ? statusTag[status]
      : undefined;

  const ask = (raw: string) => {
    const prompt = raw.trim();
    if (!prompt || blocked) return;
    navigate(octopPath, { state: { prompt } });
  };

  return (
    <section
      aria-label="问问知识库助手"
      className="@container flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e0e7d8] bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <header className="shrink-0">
        <div className="flex min-w-0 items-start gap-4">
          <StrobiAvatar
            ariaLabel="知识库助手 Strobi"
            className="mt-1 shrink-0"
            defaultAnimation="listening"
            size={42}
          />
          <div className="min-w-0 flex-1">
            <h2
              className="!m-0 truncate text-[28px] font-medium leading-9 text-[#263221] dark:text-zinc-50"
              id="platform-octop-conversation-title"
            >
              你好，{userName?.trim() || '用户'}
            </h2>
            <p className="!mb-0 !mt-1 text-[13px] leading-5 text-[#637257] dark:text-zinc-400">
              今天有什么需要我帮忙的？
            </p>
          </div>
          {badge ? (
            <Tag className="m-0" color={badge.color}>
              {badge.text}
            </Tag>
          ) : null}
        </div>
      </header>

      {badge ? (
        <div
          className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40"
          role="status"
        >
          <span className="text-sm text-amber-900 dark:text-amber-200">
            {offline
              ? '请打开 Octop 检查服务。'
              : '请先登录 Octop，再开始提问。'}
          </span>
          <Button
            icon={<LoginOutlined />}
            onClick={() => navigate(octopPath)}
            size="small"
            type="primary"
          >
            {offline ? '打开 Octop' : '去登录'}
          </Button>
        </div>
      ) : null}

      <div className="mt-5 shrink-0">
        <Sender
          autoSize={{ minRows: 4, maxRows: 6 }}
          className="!rounded-xl !border-[#d9e1d2] !bg-white shadow-[0_4px_12px_rgba(53,75,37,0.06)] dark:!border-zinc-700 dark:!bg-zinc-900"
          classNames={{
            input:
              'placeholder:!text-[#77846c] dark:placeholder:!text-zinc-500',
            suffix:
              '[&_button:not(:disabled)]:!border-[#303b2a] [&_button:not(:disabled)]:!bg-[#303b2a]',
          }}
          disabled={blocked}
          placeholder={
            offline
              ? '服务不可用'
              : status === 'unauthenticated'
                ? '登录后可提问'
                : '问问知识库助手…'
          }
          suffix={(node, { components: { SendButton } }) =>
            checking ? (
              <SendButton aria-label="助手准备中" disabled loading />
            ) : (
              node
            )
          }
          styles={{
            content: { minHeight: 134, padding: 16 },
            input: {
              outline: 'none',
              fontSize: 16,
              lineHeight: '24px',
              paddingBlock: 3,
            },
          }}
          value={senderValue}
          onChange={setSenderValue}
          onSubmit={(message) => {
            if (blocked) return;
            ask(message);
            setSenderValue('');
          }}
        />
      </div>

      <div className="mt-auto min-h-0 min-w-0 overflow-y-auto pt-6">
        <Prompts
          aria-label="Octop 对话建议"
          className="min-w-0 [&_h6]:line-clamp-2 [&_h6]:!text-[13px] [&_h6]:!leading-5 [&_h6]:!text-[#56644b] dark:[&_h6]:!text-zinc-200"
          fadeIn={false}
          items={promptItems}
          title={
            <span className="flex items-center gap-2">
              <BulbOutlined
                aria-hidden
                style={{ color: '#FFD700', fontSize: 14 }}
              />
              你可以这样提问
            </span>
          }
          classNames={{
            title:
              '!mb-3 !text-xs !leading-[18px] !text-[#637257] dark:!text-zinc-400',
            list: '!m-0 !grid !w-full !grid-cols-1 !gap-3 @min-[28rem]:!grid-cols-[repeat(2,minmax(0,1fr))]',
            item: '!min-w-0 !rounded-[9px] !border !border-[#e0e7d8] !bg-white hover:!bg-zinc-50 dark:!border-zinc-700 dark:!bg-zinc-900 dark:hover:!bg-zinc-800',
            itemContent: 'min-w-0',
          }}
          styles={{
            item: {
              minHeight: 56,
              paddingBlock: 10,
              paddingInline: 12,
              alignItems: 'center',
              opacity: badge ? 0.5 : 1,
              pointerEvents: blocked ? 'none' : 'auto',
            },
          }}
          onItemClick={({ data }) => {
            const label = data.label;
            if (typeof label === 'string') ask(label);
          }}
        />
      </div>
    </section>
  );
};

export default PlatformOctopConversations;
