import {
  BulbOutlined,
  CloudOutlined,
  FileTextOutlined,
  RadarChartOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Prompts, type PromptsItemType, Sender } from '@ant-design/x';
import { createAvatar } from '@bible-strong/avatar-react';
import { useNavigate } from '@umijs/max';
import { useState } from 'react';
import { statusColors } from '@/theme/statusColors';
import { getPlatformAppPagePath } from '@/utils/workspaceRoutes';
import '@bible-strong/avatar-react/styles.css';
import {
  platformOverviewCardClassName,
  platformOverviewCardHeaderClassName,
} from './cardChrome';
import strobiDefinition from './strobi.avatar.json';

const StrobiAvatar = createAvatar(strobiDefinition);

const xoneAiOverview = getPlatformAppPagePath('ai-assistant', 'overview');
const composerHint = '问问权限、用量或成员…';

const promptItems: PromptsItemType[] = [
  {
    key: 'ops-daily-report',
    icon: <FileTextOutlined style={{ color: '#13c2c2' }} />,
    label: '运维日报生成',
    description: '自动汇总告警与故障，提炼风险点',
  },
  {
    key: 'lowalt-flight-analysis',
    icon: <RadarChartOutlined style={{ color: statusColors.success.ink }} />,
    label: '低空飞行数据分析',
    description: '识别异常模式与设备损耗趋势',
  },
  {
    key: 'lowalt-route-risk',
    icon: <CloudOutlined style={{ color: '#1677ff' }} />,
    label: '低空航线风险预测',
    description: '结合天气与明日航线预判风险',
  },
  {
    key: 'user-lookup',
    icon: <SearchOutlined style={{ color: statusColors.warning.ink }} />,
    label: '查找特定用户',
    description: '查看用户的角色与权限范围',
  },
];

/** 工作台起草口：建议或 Sender 提交后把 prompt 交给 xOne。 */
export const PlatformStartConversation = () => {
  const navigate = useNavigate();
  const [senderValue, setSenderValue] = useState('');

  const launchXone = (raw: string) => {
    const prompt = raw.trim();
    if (!prompt) return;
    navigate(xoneAiOverview, { state: { prompt } });
  };

  return (
    <section
      aria-labelledby="platform-start-conversation-title"
      className={`${platformOverviewCardClassName} @container`}
    >
      <header className={platformOverviewCardHeaderClassName}>
        <div className="flex min-w-0 items-center gap-2">
          <StrobiAvatar
            ariaLabel="xOneAI 助手 Strobi"
            className="shrink-0"
            defaultAnimation="listening"
            size={36}
          />
          <h2
            className="m-0 translate-y-1 truncate text-base font-semibold leading-7 text-zinc-950 dark:text-zinc-50"
            id="platform-start-conversation-title"
          >
            问问小One
          </h2>
        </div>
      </header>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
        <Prompts
          aria-label="对话建议"
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
            list: '!m-0 !grid !w-full !grid-cols-1 !gap-x-3 !gap-y-2 @min-[28rem]:!grid-cols-[repeat(2,minmax(0,18rem))] @min-[28rem]:!justify-start',
            item: '!min-w-0 !border !border-zinc-200 !bg-white hover:!bg-zinc-50 dark:!border-zinc-700 dark:!bg-zinc-900 dark:hover:!bg-zinc-800',
            itemContent: 'min-w-0',
          }}
          styles={{
            item: {
              paddingBlock: 12,
              paddingInline: 12,
            },
          }}
          onItemClick={({ data }) => {
            const label = data.label;
            if (typeof label === 'string') launchXone(label);
          }}
        />
      </div>

      <div className="shrink-0 bg-white px-3 pb-3 pt-2 dark:bg-zinc-900">
        <Sender
          autoSize={{ minRows: 1, maxRows: 4 }}
          className="shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
          placeholder={composerHint}
          styles={{ input: { outline: 'none' } }}
          value={senderValue}
          onChange={setSenderValue}
          onSubmit={(message) => {
            launchXone(message);
            setSenderValue('');
          }}
        />
      </div>
    </section>
  );
};

export default PlatformStartConversation;
