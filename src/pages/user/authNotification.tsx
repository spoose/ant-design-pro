import type { NotificationArgsProps } from 'antd';
import type { Key } from 'react';
import type { AuthErrorDetails } from '@/services/auth';

export type AuthNotificationApi = {
  error: (config: NotificationArgsProps) => void;
  destroy: (key?: Key) => void;
};

export function showAuthErrorNotification(
  notification: AuthNotificationApi,
  options: {
    key: string;
    title: string;
    details: AuthErrorDetails;
  },
) {
  notification.error({
    key: options.key,
    title: options.title,
    description: (
      <div>
        <div>{options.details.message}</div>
        {options.details.traceId && (
          <div>追踪编号：{options.details.traceId}</div>
        )}
      </div>
    ),
    placement: 'topRight',
    duration: false,
    closable: true,
    role: 'alert',
  });
}
