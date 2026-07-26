import { Helmet, history, Link, SelectLang } from '@umijs/max';
import { App, Button, Form, Input } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { Footer } from '@/components';
import {
  getAuthErrorDetails,
  type RegisterParams,
  registerAccount,
} from '@/services/auth';
import { showAuthErrorNotification } from '../authNotification';
import useStyles from './styles';

type RegisterFormValues = RegisterParams & {
  confirmPassword: string;
};

const Register: FC = () => {
  const { styles } = useStyles();
  const [submitting, setSubmitting] = useState(false);
  const { message, notification } = App.useApp();

  const onFinish = async (values: RegisterFormValues) => {
    setSubmitting(true);
    notification.destroy('register-request-error');
    try {
      const response = await registerAccount(
        {
          username: values.username.trim(),
          email: values.email.trim(),
          name: values.name.trim(),
          password: values.password,
        },
        { skipErrorHandler: true },
      );
      message.success('注册成功，请登录');
      history.replace(
        `/user/login?account=${encodeURIComponent(response.data.username)}`,
      );
    } catch (error) {
      showAuthErrorNotification(notification, {
        key: 'register-request-error',
        title: '注册失败',
        details: getAuthErrorDetails(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>注册 - JUSHU AI</title>
      </Helmet>
      <div className={styles.lang} data-lang>
        {SelectLang && <SelectLang />}
      </div>
      <main className={styles.content}>
        <div className={styles.main}>
          <div className={styles.brand}>
            <img className={styles.logo} alt="JUSHU" src="/jushu-logo.svg" />
            <h1>创建账户</h1>
            {/* <p>填写账户信息，注册后即可登录。</p> */}
          </div>

          <Form<RegisterFormValues>
            layout="vertical"
            name="UserRegister"
            variant="filled"
            requiredMark={false}
            scrollToFirstError={{ focus: true }}
            onFinish={onFinish}
          >
            <Form.Item
              label="用户名"
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少需要 3 个字符' },
                { max: 64, message: '用户名不能超过 64 个字符' },
                {
                  pattern: /^[a-zA-Z0-9._-]+$/,
                  message: '只能包含字母、数字、点、下划线和连字符',
                },
              ]}
            >
              <Input
                size="large"
                autoComplete="username"
                placeholder="例如：jushu.user"
              />
            </Form.Item>

            <Form.Item
              label="展示名"
              name="name"
              rules={[
                { required: true, whitespace: true, message: '请输入展示名称' },
                { max: 120, message: '展示名称不能超过 120 个字符' },
              ]}
            >
              <Input size="large" autoComplete="name" placeholder="你的姓名" />
            </Form.Item>

            <Form.Item
              label="邮箱"
              name="email"
              rules={[
                { required: true, message: '请输入邮箱地址' },
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

            <Form.Item
              label="密码"
              name="password"
              // extra="使用 12–128 个字符。"
              rules={[
                { required: true, message: '请输入密码' },
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
              label="确认密码"
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: '请再次输入密码' },
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
                placeholder="再次输入密码"
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
              注册
            </Button>
          </Form>

          <div className={styles.login}>
            已有账户？{' '}
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

export default Register;
