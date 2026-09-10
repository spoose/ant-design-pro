import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useLocation, useSearchParams } from '@umijs/max';
import { useEffect, useRef, useState } from 'react';
import { getWorkspaceOrganizationId } from '@/utils/workspaceRoutes';
import {
  type NotificationItem,
  notificationDetails,
  notificationItems,
} from './data';
import './style.css';

type Filter = 'all' | 'pending' | 'done' | 'rejected';
const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待处理' },
  { key: 'done', label: '已完成' },
  { key: 'rejected', label: '已驳回' },
];
const statusLabels = {
  pending: '待批准',
  processing: '处理中',
  done: '已完成',
  rejected: '已驳回',
};
const severityLabels = { urgent: '紧急', high: '高', normal: '普通' };
const isPending = (item: NotificationItem) =>
  item.status === 'pending' || item.status === 'processing';
const matches = (item: NotificationItem, filter: Filter) =>
  filter === 'all' ||
  (filter === 'pending' ? isPending(item) : item.status === filter);

function Badges({ item }: { item: NotificationItem }) {
  return (
    <div className="nc-badges">
      <span className="nc-chip nc-type">{item.type}</span>
      <span className={`nc-chip nc-severity-${item.severity}`}>
        <span aria-hidden="true" className="nc-dot" />
        {severityLabels[item.severity]}
      </span>
      <span className={`nc-chip nc-status-${item.status}`}>
        {statusLabels[item.status]}
      </span>
    </div>
  );
}

/** 本地演示状态不持久化；切换工作区重新初始化，避免跨 Scope 复用处理结果。 */
export function NotificationCenterContent() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState(notificationItems);
  const [feedback, setFeedback] = useState('');
  const [confirmation, setConfirmation] = useState<{
    key: string;
    action: 'done' | 'rejected';
  }>();
  const heading = useRef<HTMLHeadingElement>(null);
  const filter =
    filters.find((entry) => entry.key === params.get('status'))?.key ?? 'all';
  const selectedKey = params.get('notification');
  const selected = items.find((item) => item.key === selectedKey);
  const pendingCount = items.filter(isPending).length;
  const visible = items.filter((item) => matches(item, filter));
  const featured = visible.find(isPending);

  useEffect(() => {
    heading.current?.focus();
  }, [selectedKey]);

  const navigateDetail = (key?: string) => {
    setConfirmation(undefined);
    const next = new URLSearchParams(params);
    if (key) next.set('notification', key);
    else next.delete('notification');
    setParams(next);
  };
  const process = () => {
    if (!confirmation) return;
    const target = items.find((item) => item.key === confirmation.key);
    if (!target || !isPending(target)) return;
    setItems((current) =>
      current.map((item) =>
        item.key === target.key
          ? { ...item, status: confirmation.action }
          : item,
      ),
    );
    setFeedback(
      `演示：${confirmation.action === 'done' ? '已完成处理' : '已驳回'} · ${target.title}`,
    );
    setConfirmation(undefined);
  };
  const actions = (item: NotificationItem) =>
    isPending(item) ? (
      <>
        <button
          className="nc-button nc-primary"
          type="button"
          onClick={() => {
            navigateDetail(item.key);
            setConfirmation({ key: item.key, action: 'done' });
          }}
        >
          {item.status === 'processing' || item.type !== '无人机审批'
            ? '确认处理完成'
            : '批准申请'}
          <CheckOutlined />
        </button>
        {item.status === 'pending' && item.type === '无人机审批' ? (
          <button
            className="nc-button"
            type="button"
            onClick={() => {
              navigateDetail(item.key);
              setConfirmation({ key: item.key, action: 'rejected' });
            }}
          >
            驳回
          </button>
        ) : null}
      </>
    ) : (
      <span className="nc-muted">此通知已归档，无需重复处理</span>
    );

  return (
    <section className="notification-center" aria-label="通知中心">
      <div className="nc-shell">
        {selectedKey ? (
          <button
            className="nc-back"
            type="button"
            onClick={() => navigateDetail()}
          >
            <ArrowLeftOutlined />
            返回通知中心
          </button>
        ) : null}
        <header className="nc-heading">
          <div>
            <h1 ref={heading} tabIndex={-1}>
              {selectedKey ? '通知详情' : '通知中心'}
            </h1>
            <p>
              {selectedKey ? (
                '查看消息背景，确认下一步处理。'
              ) : (
                <>
                  你有 <strong>{pendingCount}</strong>{' '}
                  项待处理通知，审批、告警与协同消息都在这里。
                </>
              )}
            </p>
          </div>
          <span className="nc-demo">演示数据 · 操作仅在当前页面生效</span>
        </header>
        <p className="nc-feedback" role="status">
          {feedback}
        </p>
        {selectedKey ? (
          selected ? (
            <>
              <article className="nc-feature nc-detail">
                <div className="nc-card-top">
                  <Badges item={selected} />
                  <time dateTime={selected.dateTime}>{selected.time}</time>
                </div>
                <h2>{selected.title}</h2>
                <p className="nc-description">
                  {notificationDetails[selected.key].description}
                </p>
                <dl className="nc-facts">
                  <div>
                    <dt>消息来源</dt>
                    <dd>{notificationDetails[selected.key].source}</dd>
                  </div>
                  <div>
                    <dt>人员协同</dt>
                    <dd>{notificationDetails[selected.key].people}</dd>
                  </div>
                  <div>
                    <dt>通知时间</dt>
                    <dd>{selected.dateTime.slice(0, 16).replace('T', ' ')}</dd>
                  </div>
                  <div>
                    <dt>当前状态</dt>
                    <dd>{statusLabels[selected.status]}</dd>
                  </div>
                </dl>
                <div className="nc-actions">{actions(selected)}</div>
                {confirmation?.key === selected.key ? (
                  <fieldset className="nc-confirm" aria-label="确认处理">
                    <p>
                      {confirmation.action === 'done'
                        ? '确认完成这条通知的处理？'
                        : '确认驳回这条申请？'}{' '}
                      本次仅更新演示状态，不会提交真实审批。
                    </p>
                    <div className="nc-actions">
                      <button
                        className="nc-button nc-primary"
                        type="button"
                        onClick={process}
                      >
                        确认{confirmation.action === 'done' ? '完成' : '驳回'}
                      </button>
                      <button
                        className="nc-button"
                        type="button"
                        onClick={() => setConfirmation(undefined)}
                      >
                        取消
                      </button>
                    </div>
                  </fieldset>
                ) : null}
              </article>
              <section
                className="nc-history"
                aria-labelledby="nc-history-title"
              >
                <h2 id="nc-history-title">处理记录</h2>
                <ol>
                  <li>
                    <span className="nc-history-dot" />
                    <div>
                      <strong>通知已送达</strong>
                      <p>
                        {selected.dateTime.slice(0, 16).replace('T', ' ')} ·{' '}
                        {notificationDetails[selected.key].source}
                      </p>
                    </div>
                  </li>
                  <li>
                    <span className="nc-history-dot" />
                    <div>
                      <strong>{statusLabels[selected.status]}</strong>
                      <p>
                        {isPending(selected)
                          ? '等待相关人员处理'
                          : '处理结果已记录在当前演示页面'}
                      </p>
                    </div>
                  </li>
                </ol>
              </section>
            </>
          ) : (
            <div className="nc-empty">
              <h2>未找到这条通知</h2>
              <p>消息链接可能已失效，请返回列表查看其他通知。</p>
              <button
                className="nc-button"
                type="button"
                onClick={() => navigateDetail()}
              >
                返回列表
              </button>
            </div>
          )
        ) : (
          <>
            <fieldset className="nc-filters" aria-label="按通知状态筛选">
              {filters.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  aria-pressed={filter === entry.key}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set('status', entry.key);
                    setParams(next);
                  }}
                  className={
                    filter === entry.key ? 'nc-filter nc-active' : 'nc-filter'
                  }
                >
                  {entry.label}
                  <span>
                    {items.filter((item) => matches(item, entry.key)).length}
                  </span>
                </button>
              ))}
            </fieldset>
            {featured ? (
              <article className="nc-feature">
                <div className="nc-card-top">
                  <Badges item={featured} />
                  <time dateTime={featured.dateTime}>{featured.time}</time>
                </div>
                <h2>
                  <button
                    className="nc-title-link"
                    type="button"
                    onClick={() => navigateDetail(featured.key)}
                  >
                    {featured.title}
                  </button>
                </h2>
                <p className="nc-description">
                  {notificationDetails[featured.key].description}
                </p>
                <div className="nc-meta">
                  <span>
                    <TeamOutlined />
                    {notificationDetails[featured.key].people}
                  </span>
                  <span>
                    <ClockCircleOutlined />
                    {featured.time} 提交
                  </span>
                </div>
                <div className="nc-actions">
                  {actions(featured)}
                  <button
                    className="nc-button nc-ghost"
                    type="button"
                    onClick={() => navigateDetail(featured.key)}
                  >
                    查看详情
                    <ArrowRightOutlined />
                  </button>
                </div>
              </article>
            ) : null}
            <div className="nc-list">
              {visible
                .filter((item) => item !== featured)
                .map((item) => (
                  <article className="nc-row" key={item.key}>
                    <div className="nc-row-copy">
                      <h2>
                        <button
                          type="button"
                          className="nc-title-link"
                          onClick={() => navigateDetail(item.key)}
                        >
                          {item.title}
                        </button>
                      </h2>
                      <p>{notificationDetails[item.key].description}</p>
                      <span className="nc-row-meta">
                        {item.type} · {item.time}
                      </span>
                    </div>
                    <div className="nc-row-end">
                      <span className={`nc-chip nc-status-${item.status}`}>
                        {statusLabels[item.status]}
                      </span>
                      <button
                        className="nc-button nc-small"
                        type="button"
                        aria-label={`查看详情：${item.title}`}
                        onClick={() => navigateDetail(item.key)}
                      >
                        详情
                        <ArrowRightOutlined />
                      </button>
                    </div>
                  </article>
                ))}
            </div>
            {!visible.length ? (
              <div className="nc-empty">
                <CheckOutlined />
                <h2>这里暂时没有通知</h2>
                <p>当前状态下没有消息，切换到“全部”查看其他通知。</p>
              </div>
            ) : null}
          </>
        )}
        <footer className="nc-footer">
          通知仅在当前工作区内展示<span>航线审批 · 设备告警 · 人员协同</span>
        </footer>
      </div>
    </section>
  );
}

export default function NotificationCenterPage() {
  const { pathname } = useLocation();
  return (
    <NotificationCenterContent
      key={getWorkspaceOrganizationId(pathname) ?? 'platform'}
    />
  );
}
