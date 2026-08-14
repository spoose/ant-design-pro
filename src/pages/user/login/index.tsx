import { LockOutlined, MobileOutlined, UserOutlined } from '@ant-design/icons';
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
import { App, Button, Carousel, Tabs } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useState } from 'react';
import { Footer } from '@/components';
import { getFakeCaptcha } from '@/services/ant-design-pro/login';
import { getAuthErrorDetails, loginWithPassword } from '@/services/auth';
import { clearAccessToken, setAccessToken } from '@/utils/authToken';
import { resolveLandingPath } from '@/utils/workspaceRoutes';
import { showAuthErrorNotification } from '../authNotification';

const SHOW_LANGUAGE_SWITCH = false;
/** 为 Footer 预留的高度（与 Footer padding + 两行文案大致对齐） */
const LOGIN_FOOTER_RESERVE = 60;

const LOGIN_SLIDES = [
  {
    key: 'campus',
    image: '/jushu-login-campus-mosaic-transparent.webp',
    aiSlogan: '赋能集约平台，协同更稳',
    title: '兰溪城发聚数',
    description:
      '连接组织、项目与业务应用，为城市建设与运营提供统一、清晰的工作平台。',
  },
  {
    key: 'tower',
    image: '/jushu-login-tower-mosaic-cutout.webp',
    // 调无人机位置：减小 top 更靠上，减小 left 更靠左，width 控制大小
    drone: {
      src: '/jushu-login-drone-mosaic-asset-transparent.webp',
      top: '12%',
      left: '64%',
      width: 180,
    },
    aiSlogan: '赋能城市低空，感知更准、调度更稳',
    title: '城市低空智能',
    description:
      '连接低空感知、航路协同与地面业务，支撑城市空域的安全监测与高效运营。',
  },
  {
    key: 'bridge',
    image: '/jushu-login-bridge-train-mosaic-cutout.webp',
    aiSlogan: '赋能数据资产，沉淀更深、复用更广',
    title: '基础设施数字化',
    description:
      '连接建设项目、基础设施与运营数据，贯通采集、治理到资产化的数据流程。',
  },
] as const;

const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  return prefersReducedMotion;
};

type LoginFormValues = {
  username?: string;
  password?: string;
  mobile?: string;
  captcha?: string;
  autoLogin?: boolean;
};

const useStyles = createStyles(({ token }) => ({
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100dvh',
    padding: '16px 16px 0',
    overflow: 'auto',
    boxSizing: 'border-box',
    backgroundColor: token.colorBgLayout,
    '@media (max-width: 1100px)': {
      padding: 0,
      backgroundColor: token.colorBgContainer,
    },
  },
  shell: {
    position: 'relative',
    display: 'grid',
    flex: 1,
    gridTemplateColumns: 'minmax(0, 1.15fr) minmax(440px, 0.85fr)',
    width: '100%',
    maxWidth: 1600,
    minHeight: 620,
    margin: '0 auto',
    overflow: 'hidden',
    background: token.colorBgContainer,
    borderRadius: 24,
    '@media (max-width: 1100px)': {
      display: 'flex',
      minHeight: 0,
      borderRadius: 0,
    },
  },
  carousel: {
    position: 'relative',
    minWidth: 0,
    minHeight: 0,
    margin: 16,
    marginInlineEnd: 0,
    overflow: 'hidden',
    background: token.colorBgLayout,
    borderRadius: 18,
    '& .ant-carousel, & .slick-slider, & .slick-list, & .slick-track, & .slick-slide, & .slick-slide > div, & .slick-slide > div > div':
      {
        height: '100%',
      },
    '& .slick-dots': {
      insetInline: 0,
      bottom: 24,
      display: 'flex',
      justifyContent: 'center',
      width: '100%',
      margin: 0,
      transform: 'none',
    },
    '& .slick-dots li': {
      width: '8px !important',
      height: 8,
      marginInline: 5,
      borderRadius: '50%',
      overflow: 'hidden',
    },
    '& .slick-dots li::after': {
      display: 'none',
      animation: 'none',
    },
    '& .slick-dots li button': {
      width: '100%',
      height: 8,
      padding: 0,
      borderRadius: '50%',
      background: 'rgba(0, 0, 0, 0.22)',
      opacity: 1,
    },
    '& .slick-dots li.slick-active': {
      width: '8px !important',
    },
    '& .slick-dots li.slick-active button': {
      background: '#000',
      opacity: 1,
    },
    '& .slick-dots li.slick-active::after': {
      display: 'none',
      animation: 'none',
    },
    '@media (max-width: 1100px)': {
      display: 'none',
    },
  },
  slide: {
    position: 'relative',
    height: '100%',
    overflow: 'hidden',
    background: token.colorBgLayout,
    '&::after': {
      position: 'absolute',
      zIndex: 1,
      inset: 0,
      background: `linear-gradient(90deg, ${token.colorBgLayout} 0%, ${token.colorBgLayout} 30%, transparent 66%)`,
      content: '""',
      pointerEvents: 'none',
    },
  },
  slideImage: {
    position: 'absolute',
    top: 0,
    right: 'auto',
    bottom: 0,
    height: 'auto',
    marginBlock: 'auto',
    objectFit: 'contain',
    mixBlendMode: 'multiply',
  },
  campusImage: {
    left: 'clamp(260px, 21vw, 340px)',
    width: 'clamp(760px, 64vw, 1040px)',
    transform: 'translateY(30px)',
  },
  towerImage: {
    left: 'clamp(300px, 26vw, 400px)',
    width: 'clamp(300px, 24vw, 380px)',
    transform: 'translateY(22px)',
  },
  bridgeImage: {
    left: 'clamp(160px, 15vw, 240px)',
    width: 'clamp(680px, 58vw, 900px)',
    transform: 'translateY(34px)',
  },
  droneOverlay: {
    position: 'absolute',
    zIndex: 1,
    height: 'auto',
    pointerEvents: 'none',
    objectFit: 'contain',
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
  main: {
    position: 'relative',
    display: 'flex',
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(40px, 6vw, 88px)',
    boxSizing: 'border-box',
    background: token.colorBgContainer,
    '@media (max-width: 1100px)': {
      flex: 1,
      alignItems: 'flex-start',
      padding: '48px 24px 24px',
    },
    '@media (max-width: 420px)': {
      paddingInline: 20,
    },
  },
  intro: {
    position: 'absolute',
    zIndex: 2,
    top: '50%',
    left: 'clamp(32px, 4vw, 64px)',
    width: 280,
    transform: 'translateY(-50%)',
    '@media (max-width: 1100px)': {
      display: 'none',
    },
  },
  aiSlogan: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    margin: '0 0 12px',
    color: token.colorTextSecondary,
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0.02em',
  },
  aiSloganMark: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
    paddingInline: 6,
    color: token.colorText,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    lineHeight: 1,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: 4,
    background: 'rgba(255, 255, 255, 0.72)',
  },
  introTitle: {
    margin: '0 0 16px',
    color: token.colorText,
    fontSize: 28,
    fontWeight: 600,
    lineHeight: 1.35,
    letterSpacing: 0,
    textWrap: 'balance',
  },
  introText: {
    maxWidth: '28ch',
    margin: 0,
    color: token.colorTextSecondary,
    fontSize: 16,
    lineHeight: 1.75,
    textWrap: 'pretty',
  },
  panel: {
    position: 'relative',
    width: '100%',
    maxWidth: 416,
    padding: 0,
    overflow: 'visible',
    boxSizing: 'border-box',
    background: 'transparent',
    '& .ant-pro-form-login-header': {
      height: 40,
      lineHeight: '40px',
    },
    '& .ant-pro-form-login-logo': {
      width: 40,
      height: 40,
      marginInlineEnd: 12,
    },
    '& .ant-pro-form-login-title': {
      insetBlockStart: 0,
      color: token.colorText,
      fontSize: 26,
      lineHeight: 1.4,
    },
    '& .ant-pro-form-login-desc': {
      marginBlockStart: 8,
      marginBlockEnd: 24,
      color: token.colorTextSecondary,
    },
    '& .ant-tabs': {
      marginBlockEnd: 8,
    },
    '& input::placeholder': {
      color: token.colorTextTertiary,
      opacity: 1,
    },
    '@media (max-width: 1100px)': {
      maxWidth: 416,
    },
    '@media (max-width: 760px)': {
      padding: '24px 0',
    },
  },
  formActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
    '@media (max-width: 420px)': {
      alignItems: 'flex-start',
    },
  },
  formLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    whiteSpace: 'nowrap',
    '@media (max-width: 420px)': {
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 8,
    },
  },
  formLink: {
    height: 'auto',
    padding: 0,
  },
  footer: {
    position: 'relative',
    flexShrink: 0,
    minHeight: LOGIN_FOOTER_RESERVE,
    background: 'transparent',
  },
}));

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
  const prefersReducedMotion = usePrefersReducedMotion();

  /**
   * accessToken 保存后重新请求 POST /api/currentUser/get，并把认证用户写入 Umi initialState。
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

  const handleSubmit = async (values: LoginFormValues) => {
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
      <div className={styles.shell}>
        <div className={styles.carousel}>
          <Carousel
            autoplay={prefersReducedMotion ? false : { dotDuration: true }}
            autoplaySpeed={6500}
            effect="fade"
            speed={prefersReducedMotion ? 0 : 500}
            waitForAnimate
          >
            {LOGIN_SLIDES.map((slide, index) => (
              <div key={slide.key}>
                <section
                  className={styles.slide}
                  aria-labelledby={`login-slide-title-${slide.key}`}
                >
                  <img
                    className={`${styles.slideImage} ${
                      slide.key === 'campus'
                        ? styles.campusImage
                        : slide.key === 'tower'
                          ? styles.towerImage
                          : styles.bridgeImage
                    }`}
                    src={slide.image}
                    alt=""
                    aria-hidden="true"
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                  {'drone' in slide && slide.drone ? (
                    <img
                      className={styles.droneOverlay}
                      src={slide.drone.src}
                      alt=""
                      aria-hidden="true"
                      style={{
                        top: slide.drone.top,
                        left: slide.drone.left,
                        width: slide.drone.width,
                      }}
                    />
                  ) : null}
                  <div className={styles.intro}>
                    {'aiSlogan' in slide && slide.aiSlogan ? (
                      <p className={styles.aiSlogan}>
                        <span
                          className={styles.aiSloganMark}
                          aria-hidden="true"
                        >
                          AI
                        </span>
                        <span>{slide.aiSlogan}</span>
                      </p>
                    ) : null}
                    <h1
                      id={`login-slide-title-${slide.key}`}
                      className={styles.introTitle}
                    >
                      {slide.title}
                    </h1>
                    <p className={styles.introText}>{slide.description}</p>
                  </div>
                </section>
              </div>
            ))}
          </Carousel>
        </div>
        <main className={styles.main}>
          <section className={styles.panel} aria-label="账户登录">
            <LoginForm<LoginFormValues>
              contentStyle={{
                width: '100%',
                minWidth: 0,
                maxWidth: 'none',
                margin: 0,
              }}
              containerStyle={{
                height: 'auto',
                padding: 0,
                overflow: 'visible',
                background: 'transparent',
              }}
              logo={<img alt="JUSHU" src="/jushu-logo.svg" />}
              title="xOne AI"
              subTitle="集约运维平台｜AI赋能"
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
              onFinish={handleSubmit}
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
              <div className={styles.formActions}>
                <ProFormCheckbox noStyle name="autoLogin">
                  <FormattedMessage
                    id="pages.login.rememberMe"
                    defaultMessage="自动登录"
                  />
                </ProFormCheckbox>
                <div className={styles.formLinks}>
                  <Button
                    type="link"
                    className={styles.formLink}
                    onClick={() => history.push('/user/register')}
                  >
                    注册账户
                  </Button>
                  <Button
                    type="link"
                    className={styles.formLink}
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
          </section>
        </main>
      </div>
      <div className={styles.footer}>
        <Footer />
      </div>
    </div>
  );
};

export default Login;
