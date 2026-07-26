import { Helmet, history, Link, useSearchParams } from '@umijs/max';
import { App, Button, Form, Input } from 'antd';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { Footer } from '@/components';
import { getAuthErrorDetails, resetPassword } from '@/services/auth';
import { showAuthErrorNotification } from '../authNotification';
import useStyles from '../register/styles';

type ResetPasswordForm = {
  password: string;
  confirmPassword: string;
};

const ResetPassword: FC = () => {
  const { styles } = useStyles();
  const { message, notification } = App.useApp();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const token = searchParams.get('token')?.trim() ?? '';
  const account = searchParams.get('account')?.trim() ?? '';

  useEffect(() => {
    if (!token) {
      showAuthErrorNotification(notification, {
        key: 'reset-password-error',
        title: '无法重置密码',
        details: {
          message: '缺少密码重置凭证，请重新获取重置链接',
        },
      });
    }
    return () => notification.destroy('reset-password-error');
  }, [notification, token]);

  const onFinish = async (values: ResetPasswordForm) => {
    if (!token) return;
    setSubmitting(true);
    notification.destroy('reset-password-error');
    try {
      await resetPassword(
        { token, password: values.password },
        { skipErrorHandler: true },
      );
      message.success('密码已重置，请重新登录');
      history.replace(
        account
          ? `/user/login?account=${encodeURIComponent(account)}`
          : '/user/login',
      );
    } catch (error) {
      showAuthErrorNotification(notification, {
        key: 'reset-password-error',
        title: '无法重置密码',
        details: getAuthErrorDetails(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>重置密码 - JUSHU AI</title>
      </Helmet>
      <main className={styles.content}>
        <div className={styles.main}>
          <div className={styles.brand}>
            <img className={styles.logo} alt="JUSHU" src="/jushu-logo.svg" />
            <h1>设置新密码</h1>
            <p>重置链接将在 15 分钟后失效，且只能使用一次。</p>
          </div>

          {token && (
            <Form<ResetPasswordForm>
              layout="vertical"
              name="ResetPassword"
              variant="filled"
              requiredMark={false}
              scrollToFirstError={{ focus: true }}
              onFinish={onFinish}
            >
              <Form.Item
                label="新密码"
                name="password"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 12, message: '密码至少需要 12 个字符' },
                  { max: 128, message: '密码不能超过 128 个字符' },
                ]}
              >
                <Input.Password
                  size="large"
                  autoComplete="new-password"
                  placeholder="至少 12 个字符"
                />
              </Form.Item>
              <Form.Item
                label="确认新密码"
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请再次输入新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  size="large"
                  autoComplete="new-password"
                  placeholder="再次输入新密码"
                />
              </Form.Item>
              <Button
                className={styles.submit}
                size="large"
                loading={submitting}
                type="primary"
                htmlType="submit"
                block
              >
                重置密码
              </Button>
            </Form>
          )}

          <div className={styles.login}>
            {token ? (
              <Link to="/user/login" prefetch>
                返回登录
              </Link>
            ) : (
              <Link to="/user/forgot-password" prefetch>
                重新获取重置链接
              </Link>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;
