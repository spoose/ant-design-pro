const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'] as const;

/** 工作台问候条日期：8月18日 · 星期二。 */
export const formatPlatformWelcomeDate = (date: Date) => {
  const weekday = weekdayLabels[date.getDay()];
  return `${date.getMonth() + 1}月${date.getDate()}日 · 星期${weekday}`;
};

/** 工作台页头问候文案；姓名与角色来自 POST /api/currentUser/get。 */
export const getPlatformWelcomeHeading = ({
  userName,
  isSuperAdmin = false,
  date = new Date(),
}: {
  userName?: string;
  isSuperAdmin?: boolean;
  date?: Date;
}) => {
  const displayName = userName?.trim() || '用户';
  const roleLabel = isSuperAdmin ? '平台管理员' : '管理中心';

  return {
    title: `你好，${displayName}`,
    description: `${formatPlatformWelcomeDate(date)} · ${roleLabel}`,
  };
};
