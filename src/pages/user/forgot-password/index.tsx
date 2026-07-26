import { Helmet, history, Link } from '@umijs/max';
import { Alert, App, Button, Form, Input } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { Footer } from '@/components';
import { getAuthErrorDetails, requestPasswordReset } from '@/services/auth';
import { showAuthErrorNotification } from '../authNotification';
import useStyles from '../register/styles';

type ForgotPasswordForm = {
  email: string;
};

const ForgotPassword: FC = () => {
  const { styles } = useStyles();
  const { notification } = App.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);

  const onFinish = async (values: ForgotPasswordForm) => {
    const email = values.email.trim().toLowerCase();
    setSubmitting(true);
    notification.destroy('forgot-password-error');
    try {
      const response = await requestPasswordReset(email, {
        skipErrorHandler: true,
      });
      const resetToken = response.data.developmentResetToken;
      if (resetToken) {
        history.replace(
          `/user/reset-password?token=${encodeURIComponent(resetToken)}&account=${encodeURIComponent(email)}`,
        );
        return;
      }
      setRequested(true);
    } catch (error) {
      showAuthErrorNotification(notification, {
        key: 'forgot-password-error',
        title: '无法发送重置链接',
        details: getAuthErrorDetails(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>忘记密码 - JUSHU AI</title>
      </Helmet>
      <main className={styles.content}>
        <div className={styles.main}>
          <div className={styles.brand}>
            <img className={styles.logo} alt="JUSHU" src="/jushu-logo.svg" />
            <h1>找回密码</h1>
            <p>输入注册邮箱以获取一次性重置链接。</p>
          </div>

          {requested && (
            <Alert
              className={styles.errorAlert}
              title="请求已受理"
              description="如果该邮箱存在，我们会发送密码重置链接。"
              type="success"
              showIcon
            />
          )}

          <Form<ForgotPasswordForm>
            layout="vertical"
            name="ForgotPassword"
            variant="filled"
            requiredMark={false}
            onFinish={onFinish}
          >
            <Form.Item
              label="邮箱"
              name="email"
              rules={[
                { required: true, message: '请输入注册邮箱' },
                { type: 'email', message: '邮箱地址格式不正确' },
                { max: 254, message: '邮箱不能超过 254 个字符' },
              ]}
            >
              <Input
                size="large"
                autoComplete="email"
                placeholder="name@example.com"
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
              获取重置链接
            </Button>
          </Form>

          <div className={styles.login}>
            <Link to="/user/login" prefetch>
              返回登录
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ForgotPassword;
