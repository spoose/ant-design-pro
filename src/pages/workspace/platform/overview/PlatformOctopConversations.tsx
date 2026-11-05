import {
  BulbOutlined,
  CloudOutlined,
  FileTextOutlined,
  LoginOutlined,
  RadarChartOutlined,
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
import {
  platformOverviewCardClassName,
  platformOverviewCardHeaderClassName,
} from './cardChrome';
import '@bible-strong/avatar-react/styles.css';
import strobiDefinition from './strobi.avatar.json';

// 与「问问小One」使用同一头像，保持两张卡片的视觉一致。
const StrobiAvatar = createAvatar(strobiDefinition);

const promptItems: PromptsItemType[] = [
  {
    key: 'octop-knowledge',
    icon: <FileTextOutlined style={{ color: '#13c2c2' }} />,
    label: '介绍一下聚数公司',
    description: '了解聚数公司的基本情况',
  },
  {
    key: 'octop-research',
    icon: <RadarChartOutlined style={{ color: statusColors.success.ink }} />,
    label: '今日菜单',
    description: '查询今天的食堂菜单',
  },
  {
    key: 'octop-draft',
    icon: <CloudOutlined style={{ color: '#1677ff' }} />,
    label: '帮我起草一份上会说明',
    description: '根据事项起草上会材料',
  },
  {
    key: 'octop-explain',
    icon: <SearchOutlined style={{ color: statusColors.warning.ink }} />,
    label: '生成今日兰溪招投标信息简报',
    description: '汇总今日兰溪招投标信息',
  },
];

const statusTag = {
  idle: { color: 'default', text: '待打开' },
  checking: { color: 'processing', text: '正在确认登录' },
  authenticated: { color: 'success', text: '已登录' },
  unauthenticated: { color: 'default', text: '未登录' },
  offline: { color: 'warning', text: '服务不可用' },
} as const;

/**
 * 工作台「问问知识库助手」卡片：结构与「问问小One」一致，提问经 wujie 内嵌的 Octop 发送。
 * 未登录或服务不可用时，引导用户打开 Octop。提问统一导航到 Octop 页，
 * 由页面挂载后经 bridge 投递；登录态确认前问题在页面侧排队。
 */
export const PlatformOctopConversations = ({
  userId,
  octopPath,
}: {
  userId?: string;
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
  const blocked = status === 'unauthenticated' || offline;
  const badge = statusTag[status];

  const ask = (raw: string) => {
    const prompt = raw.trim();
    if (!prompt || blocked) return;
    navigate(octopPath, { state: { prompt } });
  };

  return (
    <section
      aria-labelledby="platform-octop-conversation-title"
      className={`${platformOverviewCardClassName} @container`}
    >
      <header className={platformOverviewCardHeaderClassName}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <StrobiAvatar
            ariaLabel="知识库助手 Strobi"
            className="shrink-0"
            defaultAnimation="listening"
            size={36}
          />
          <h2
            className="m-0 translate-y-1 truncate text-base font-semibold leading-7 text-zinc-950 dark:text-zinc-50"
            id="platform-octop-conversation-title"
          >
            问问知识库助手
          </h2>
          <Tag className="m-0" color={badge.color}>
            {badge.text}
          </Tag>
        </div>
      </header>

      {blocked ? (
        <div
          className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40"
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

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
        <Prompts
          aria-label="Octop 对话建议"
          className="min-w-0 [&_h6]:line-clamp-2 [&_p]:line-clamp-1"
          fadeIn={false}
          items={promptItems}
          title={
            <span className="inline-flex items-center gap-2">
              <BulbOutlined aria-hidden style={{ color: '#FFD700' }} />
              你可以这样提问
            </span>
          }
          classNames={{
            title: '!mb-2',
            list: '!m-0 !grid !w-full !grid-cols-1 !gap-x-3 !gap-y-2 @min-[28rem]:!grid-cols-[repeat(2,minmax(0,1fr))]',
            item: '!min-w-0 !border !border-zinc-200 !bg-white hover:!bg-zinc-50 dark:!border-zinc-700 dark:!bg-zinc-900 dark:hover:!bg-zinc-800',
            itemContent: 'min-w-0',
          }}
          styles={{
            item: {
              paddingBlock: 12,
              paddingInline: 12,
              opacity: blocked ? 0.5 : 1,
              pointerEvents: blocked ? 'none' : 'auto',
            },
          }}
          onItemClick={({ data }) => {
            const label = data.label;
            if (typeof label === 'string') ask(label);
          }}
        />
      </div>
      <div className="shrink-0 bg-white px-3 pb-3 pt-2 dark:bg-zinc-900">
        <Sender
          autoSize={{ minRows: 1, maxRows: 4 }}
          className="shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
          disabled={blocked}
          placeholder={
            offline
              ? '服务不可用'
              : blocked
                ? '登录后可提问'
                : '问问知识库助手…'
          }
          styles={{ input: { outline: 'none' } }}
          value={senderValue}
          onChange={setSenderValue}
          onSubmit={(message) => {
            ask(message);
            setSenderValue('');
          }}
        />
      </div>
    </section>
  );
};

export default PlatformOctopConversations;
