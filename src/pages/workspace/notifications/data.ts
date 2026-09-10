export type NotificationStatus = 'pending' | 'processing' | 'done' | 'rejected';
export type NotificationSeverity = 'urgent' | 'high' | 'normal';
export type NotificationFilter = 'all' | 'pending' | 'handled';

export type NotificationItem = {
  key: string;
  type: string;
  title: string;
  time: string;
  dateTime: string;
  severity: NotificationSeverity;
  status: NotificationStatus;
  aiSuggested?: boolean;
};

export const notificationItems: NotificationItem[] = [
  {
    key: 'drone-dam-inspection',
    type: '无人机审批',
    title: '水库大坝巡检 · 航线等待批准',
    time: '14:32',
    dateTime: '2026-08-31T14:32:00+08:00',
    severity: 'high',
    status: 'pending',
  },
  {
    key: 'weather-operation-notice',
    type: '无人机审批',
    title: '雷雨大风预警 · 4 条无人机航线建议改期',
    time: '13:48',
    dateTime: '2026-08-31T13:48:00+08:00',
    severity: 'urgent',
    status: 'pending',
    aiSuggested: true,
  },
  {
    key: 'charging-station-offline',
    type: '设备告警',
    title: '1 号机坪充电桩离线，运维人员正在处理',
    time: '11:40',
    dateTime: '2026-08-31T11:40:00+08:00',
    severity: 'urgent',
    status: 'processing',
  },
  {
    key: 'edge-node-upgrade',
    type: '系统维护',
    title: '边缘节点版本更新已完成',
    time: '昨日 23:10',
    dateTime: '2026-08-30T23:10:00+08:00',
    severity: 'normal',
    status: 'done',
  },
  {
    key: 'airport-zone-review',
    type: '无人机审批',
    title: '机场禁区临时航线申请未通过',
    time: '昨日 18:25',
    dateTime: '2026-08-30T18:25:00+08:00',
    severity: 'high',
    status: 'rejected',
  },
  {
    key: 'backup-complete',
    type: '运维通知',
    title: '飞行任务数据备份已完成',
    time: '昨日 02:00',
    dateTime: '2026-08-30T02:00:00+08:00',
    severity: 'normal',
    status: 'done',
  },
];

export const notificationDetails: Record<
  string,
  { description: string; people: string; source: string }
> = {
  'drone-dam-inspection': {
    description:
      '水库大坝巡检航线已提交，等待负责人确认作业安排。请核对巡检范围、飞手排班与现场条件后处理本次申请。',
    people: '3 名飞手',
    source: '政务低空 · 航线审批',
  },
  'weather-operation-notice': {
    description:
      '雷雨大风可能影响 4 条无人机航线。建议核对天气变化与任务窗口，确认是否调整执行计划。',
    people: '2 名调度人员',
    source: '政务低空 · 运行提醒',
  },
  'charging-station-offline': {
    description:
      '1 号机坪充电桩连接中断，运维人员正在排查。请关注设备恢复情况，并在恢复后确认处理结果。',
    people: '1 名运维人员',
    source: '设备监控 · 机坪告警',
  },
  'edge-node-upgrade': {
    description:
      '边缘节点版本更新已完成。本条消息用于记录更新结果，无需再次审批。',
    people: '无需人员协同',
    source: '集约运维 · 系统维护',
  },
  'airport-zone-review': {
    description:
      '机场禁区临时航线申请未通过。申请方需要重新核对空域范围后提交新的申请。',
    people: '无需人员协同',
    source: '政务低空 · 航线审批',
  },
  'backup-complete': {
    description:
      '飞行任务数据备份已完成。本条消息用于记录备份结果，无需进一步处理。',
    people: '无需人员协同',
    source: '集约运维 · 数据备份',
  },
};
