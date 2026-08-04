import { Helmet, history, useModel } from '@umijs/max';
import { Alert, Button, Empty, Radio } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import { getOrganizationHomePath } from '@/utils/workspaceRoutes';
import Settings from '../../../../config/defaultSettings';
import { setDefaultOrganization } from './service';

const useStyles = createStyles(({ token }) => {
  return {
    container: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    },
    content: {
      flex: 1,
      padding: '96px 0 32px',
    },
    main: {
      width: 368,
      maxWidth: '75vw',
      margin: '0 auto',
    },
    header: {
      textAlign: 'center',
      marginBottom: 32,
    },
    logo: {
      height: 44,
      marginBottom: 16,
    },
    title: {
      margin: 0,
      color: token.colorTextHeading,
      fontSize: 24,
      lineHeight: 1.4,
      fontWeight: 600,
    },
    subtitle: {
      marginTop: 12,
      color: token.colorTextSecondary,
      fontSize: 14,
    },
    alert: {
      marginBottom: 24,
    },
    radioGroup: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    },
    option: {
      width: '100%',
      minHeight: 56,
      marginInlineEnd: 0,
      padding: '12px 16px',
      border: `1px solid ${token.colorBorder}`,
      borderRadius: token.borderRadius,
      background: token.colorBgContainer,
      transition: 'border-color 0.2s',
      '&:hover': {
        borderColor: token.colorPrimaryBorderHover,
      },
    },
    optionName: {
      color: token.colorText,
      fontWeight: 500,
    },
    optionMeta: {
      marginTop: 4,
      color: token.colorTextSecondary,
      fontSize: 12,
    },
    submit: {
      width: '100%',
      marginTop: 24,
    },
  };
});

const SelectEntry = () => {
  const { styles } = useStyles();
  const { initialState, setInitialState } = useModel('@@initialState');
  // organizations 由 GET /api/currentUser 提供，选择页不再发起第二次列表请求。
  const organizations = initialState?.currentUser?.organizations ?? [];
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!selectedOrganizationId) return;

    setSubmitting(true);
    setErrorMessage('');
    try {
      const selectedOrganization = organizations.find(
        (organization) =>
          organization.organizationId === selectedOrganizationId,
      );
      if (!selectedOrganization) {
        throw new Error('选择的组织不存在');
      }

      const result = await setDefaultOrganization(selectedOrganizationId);
      if (result.data.defaultOrganizationId !== selectedOrganizationId) {
        throw new Error('设置默认组织接口未返回正确的组织 ID');
      }
      setInitialState((state) => ({
        ...state,
        currentUser: state?.currentUser
          ? {
              ...state.currentUser,
              defaultOrganizationId: selectedOrganization.organizationId,
            }
          : state?.currentUser,
      }));
      history.replace(
        getOrganizationHomePath(selectedOrganization.organizationId),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '选择登录入口失败';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          选择登录入口
          {Settings.title && ` - ${Settings.title}`}
        </title>
      </Helmet>
      <div className={styles.content}>
        <div className={styles.main}>
          <div className={styles.header}>
            {/* <img alt="logo" className={styles.logo} src="/logo.svg" /> */}
            <h1 className={styles.title}>选择登录入口</h1>
            <div className={styles.subtitle}>请选择本次登录使用的组织</div>
          </div>
          {errorMessage && (
            <Alert
              className={styles.alert}
              showIcon
              title={errorMessage}
              type="error"
            />
          )}
          {organizations.length > 0 ? (
            <>
              <Radio.Group
                className={styles.radioGroup}
                onChange={(event) => {
                  setSelectedOrganizationId(event.target.value);
                }}
                value={selectedOrganizationId}
              >
                {organizations.map((organization) => (
                  <Radio
                    className={styles.option}
                    key={organization.organizationId}
                    value={organization.organizationId}
                  >
                    <div className={styles.optionName}>
                      {organization.organizationName}
                    </div>
                    <div className={styles.optionMeta}>
                      {organization.organizationCode}
                    </div>
                  </Radio>
                ))}
              </Radio.Group>
              <Button
                className={styles.submit}
                disabled={!selectedOrganizationId}
                loading={submitting}
                onClick={handleSubmit}
                size="large"
                type="primary"
              >
                进入首页
              </Button>
            </>
          ) : (
            <>
              <Empty description="暂无可选登录入口" />
              <Button
                className={styles.submit}
                disabled
                size="large"
                type="primary"
              >
                进入首页
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectEntry;
