import {
  AlipayCircleOutlined,
  LockOutlined,
  MobileOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormCaptcha,
  ProFormCheckbox,
  ProFormText,
} from '@ant-design/pro-components';
import {
  FormattedMessage,
  Helmet,
  history,
  SelectLang,
  useIntl,
  useModel,
  useSearchParams,
} from '@umijs/max';
import { App, Button, Tabs } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import { Footer } from '@/components';
import { getFakeCaptcha } from '@/services/ant-design-pro/login';
import { getAuthErrorDetails, loginWithPassword } from '@/services/auth';
import { clearAccessToken, setAccessToken } from '@/utils/authToken';
import { resolveLandingPath } from '@/utils/workspaceRoutes';
import { showAuthErrorNotification } from '../authNotification';

const SHOW_LANGUAGE_SWITCH = false;

const useStyles = createStyles(({ token }) => {
  return {
    action: {
      marginLeft: '8px',
      color: 'rgba(0, 0, 0, 0.2)',
      fontSize: '24px',
      verticalAlign: 'middle',
      cursor: 'pointer',
      transition: 'color 0.3s',
      '&:hover': {
        color: token.colorPrimaryActive,
      },
    },
    lang: {
      width: 42,
      height: 42,
      lineHeight: '42px',
      position: 'fixed',
      right: 16,
      borderRadius: token.borderRadius,
      ':hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    },
  };
});

const _ActionIcons = () => {
  const { styles } = useStyles();

  return (
    <>
      <AlipayCircleOutlined
        key="AlipayCircleOutlined"
        className={styles.action}
      />
      {/* <TaobaoCircleOutlined
        key="TaobaoCircleOutlined"
        className={styles.action}
      />
      <WeiboCircleOutlined
        key="WeiboCircleOutlined"
        className={styles.action}
      /> */}
    </>
  );
};

const Lang = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.lang} data-lang>
      {SelectLang && <SelectLang />}
    </div>
  );
};

const Login: React.FC = () => {
  const [type, setType] = useState<string>('account');
  const [searchParams] = useSearchParams();
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const { message, notification } = App.useApp();
  const intl = useIntl();

  /**
   * accessToken 保存后重新请求 GET /api/currentUser，并把认证用户写入 Umi initialState。
   * 返回 userInfo 给落点规则使用，避免依赖异步 State 更新是否已经提交。
   */
  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (!userInfo) throw new Error('登录成功但未获取到用户信息');

    setInitialState((state) => ({
      ...state,
      currentUser: userInfo,
    }));
    return userInfo;
  };

  const handleSubmit = async (values: API.LoginParams) => {
    notification.destroy('login-request-error');

    if (type === 'mobile') {
      showAuthErrorNotification(notification, {
        key: 'login-request-error',
        title: '登录失败',
        details: { message: '当前后端暂不支持手机号登录' },
      });
      return;
    }
    if (!values.username || !values.password) return;

    try {
      const response = await loginWithPassword(
        { account: values.username, password: values.password },
        { skipErrorHandler: true },
      );
      setAccessToken(response.data.accessToken);
      const defaultLoginSuccessMessage = intl.formatMessage({
        id: 'pages.login.success',
        defaultMessage: '登录成功！',
      });
      // 链路：登录响应 Token -> /api/currentUser -> 单一落点门面 -> Umi URL。
      const userInfo = await fetchUserInfo();
      message.success(defaultLoginSuccessMessage);
      history.replace(resolveLandingPath(userInfo));
    } catch (error) {
      clearAccessToken();
      showAuthErrorNotification(notification, {
        key: 'login-request-error',
        title: '登录失败',
        details: getAuthErrorDetails(error),
      });
    }
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>登录 - JUSHU AI</title>
      </Helmet>
      {/* 右上角语言切换按钮暂时隐藏，需要时可重新开启。 */}
      {SHOW_LANGUAGE_SWITCH && <Lang />}
      <div
        style={{
          flex: '1',
          padding: '32px 0',
        }}
      >
        <LoginForm
          contentStyle={{
            minWidth: 280,
            maxWidth: '75vw',
          }}
          logo={<img alt="JUSHU" src="/jushu-logo.svg" />}
          title="JUSHU AI"
          // subTitle="XXXXXXXX"
          initialValues={{
            autoLogin: true,
            username: searchParams.get('account') ?? undefined,
          }}
          // actions={[
          //   <FormattedMessage
          //     key="loginWith"
          //     id="pages.login.loginWith"
          //     defaultMessage="其他登录方式"
          //   />,
          //   <ActionIcons key="icons" />,
          // ]}
          onFinish={async (values) => {
            await handleSubmit(values as API.LoginParams);
          }}
        >
          <Tabs
            activeKey={type}
            onChange={(activeKey) => {
              setType(activeKey);
              notification.destroy('login-request-error');
            }}
            centered
            items={[
              {
                key: 'account',
                label: intl.formatMessage({
                  id: 'pages.login.accountLogin.tab',
                  defaultMessage: '账户密码登录',
                }),
              },
              {
                key: 'mobile',
                label: intl.formatMessage({
                  id: 'pages.login.phoneLogin.tab',
                  defaultMessage: '手机号登录',
                }),
              },
            ]}
          />

          {type === 'account' && (
            <>
              <ProFormText
                name="username"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined />,
                }}
                placeholder={intl.formatMessage({
                  id: 'pages.login.username.placeholder',
                  defaultMessage: 'admin',
                })}
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.login.username.required"
                        defaultMessage="请输入用户名!"
                      />
                    ),
                  },
                ]}
              />
              <ProFormText.Password
                name="password"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                }}
                placeholder={intl.formatMessage({
                  id: 'pages.login.password.placeholder',
                  defaultMessage: '密码: ant.design',
                })}
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.login.password.required"
                        defaultMessage="请输入密码！"
                      />
                    ),
                  },
                ]}
              />
            </>
          )}

          {type === 'mobile' && (
            <>
              <ProFormText
                fieldProps={{
                  size: 'large',
                  prefix: <MobileOutlined />,
                }}
                name="mobile"
                placeholder={intl.formatMessage({
                  id: 'pages.login.phoneNumber.placeholder',
                  defaultMessage: '手机号',
                })}
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.login.phoneNumber.required"
                        defaultMessage="请输入手机号！"
                      />
                    ),
                  },
                  {
                    pattern: /^1\d{10}$/,
                    message: (
                      <FormattedMessage
                        id="pages.login.phoneNumber.invalid"
                        defaultMessage="手机号格式错误！"
                      />
                    ),
                  },
                ]}
              />
              <ProFormCaptcha
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                }}
                captchaProps={{
                  size: 'large',
                }}
                placeholder={intl.formatMessage({
                  id: 'pages.login.captcha.placeholder',
                  defaultMessage: '请输入验证码',
                })}
                captchaTextRender={(timing, count) => {
                  if (timing) {
                    return `${count} ${intl.formatMessage({
                      id: 'pages.getCaptchaSecondText',
                      defaultMessage: '获取验证码',
                    })}`;
                  }
                  return intl.formatMessage({
                    id: 'pages.login.phoneLogin.getVerificationCode',
                    defaultMessage: '获取验证码',
                  });
                }}
                name="captcha"
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.login.captcha.required"
                        defaultMessage="请输入验证码！"
                      />
                    ),
                  },
                ]}
                onGetCaptcha={async (phone) => {
                  notification.destroy('login-request-error');
                  try {
                    const result = await getFakeCaptcha(
                      {
                        phone,
                      },
                      {
                        skipErrorHandler: true,
                      },
                    );
                    if (!result) {
                      throw new Error('认证服务未返回验证码结果');
                    }
                    message.success('获取验证码成功！验证码为：1234');
                  } catch (error) {
                    showAuthErrorNotification(notification, {
                      key: 'login-request-error',
                      title: '验证码发送失败',
                      details: getAuthErrorDetails(error),
                    });
                    throw error;
                  }
                }}
              />
            </>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}
          >
            <ProFormCheckbox noStyle name="autoLogin">
              <FormattedMessage
                id="pages.login.rememberMe"
                defaultMessage="自动登录"
              />
            </ProFormCheckbox>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => history.push('/user/register')}
              >
                注册账户
              </Button>
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => history.push('/user/forgot-password')}
              >
                <FormattedMessage
                  id="pages.login.forgotPassword"
                  defaultMessage="忘记密码"
                />
              </Button>
            </div>
          </div>
        </LoginForm>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
