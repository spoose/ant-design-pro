import { ApartmentOutlined, HomeOutlined } from '@ant-design/icons';
import { Helmet, history, Link, useModel } from '@umijs/max';
import { Alert, Button, Empty, Radio, Tag } from 'antd';
import React, { useState } from 'react';
import { Footer } from '@/components';
import {
  getOrganizationHomePath,
  getPlatformHomePath,
} from '@/utils/workspaceRoutes';
import { getPlatformAccess } from '@/utils/workspaceRules';
import useAuthStyles from '../register/styles';
import { setDefaultOrganization } from './service';
import useStyles from './styles';

const PLATFORM_SCOPE_KEY = 'platform';

const SelectEntry = () => {
  const { styles: authStyles } = useAuthStyles();
  const { styles } = useStyles();
  const { initialState, setInitialState } = useModel('@@initialState');
  // organizations 由 POST /api/currentUser/get 提供，选择页不再发起第二次列表请求。
  const currentUser = initialState?.currentUser;
  const organizations = currentUser?.organizations ?? [];
  const canEnterPlatform = currentUser
    ? getPlatformAccess(currentUser).canEnterManagementCenter
    : false;
  const [selectedKey, setSelectedKey] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const hasAnyEntry = canEnterPlatform || organizations.length > 0;

  const handleSubmit = async () => {
    if (!selectedKey) return;

    setSubmitting(true);
    setErrorMessage('');
    try {
      if (selectedKey === PLATFORM_SCOPE_KEY) {
        history.replace(getPlatformHomePath());
        return;
      }

      const selectedOrganization = organizations.find(
        (organization) => organization.organizationId === selectedKey,
      );
      if (!selectedOrganization) {
        throw new Error('选择的组织不存在');
      }

      const result = await setDefaultOrganization(
        selectedOrganization.organizationId,
      );
      if (
        result.data.defaultOrganizationId !==
        selectedOrganization.organizationId
      ) {
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
    <div className={authStyles.container}>
      <Helmet>
        <title>选择登录入口 - JUSHU AI</title>
      </Helmet>
      <main className={authStyles.content}>
        <div className={authStyles.main}>
          <div className={authStyles.brand}>
            <img
              className={authStyles.logo}
              alt="JUSHU"
              src="/jushu-logo.svg"
            />
            <h1>选择工作区</h1>
            <p>
              {currentUser?.name || currentUser?.username || '进入你的工作区'}
            </p>
          </div>
          {errorMessage && (
            <Alert
              className={authStyles.errorAlert}
              showIcon
              title={errorMessage}
              type="error"
            />
          )}
          {hasAnyEntry ? (
            <>
              <Radio.Group
                className={styles.list}
                onChange={(event) => {
                  setSelectedKey(event.target.value);
                }}
                value={selectedKey}
              >
                {canEnterPlatform && (
                  <Radio
                    className={styles.option}
                    value={PLATFORM_SCOPE_KEY}
                    data-od-id="entry-platform-console"
                  >
                    <div className={styles.optionBody}>
                      <span className={styles.iconChip}>
                        <ApartmentOutlined />
                      </span>
                      <span className={styles.optionText}>
                        <span className={styles.optionName}>
                          超管理员操控台
                        </span>
                        <span className={styles.optionMeta}>
                          平台级管理与组织管理
                        </span>
                      </span>
                    </div>
                  </Radio>
                )}
                {organizations.map((organization) => (
                  <Radio
                    className={styles.option}
                    key={organization.organizationId}
                    value={organization.organizationId}
                    data-od-id={`entry-org-${organization.organizationId}`}
                  >
                    <div className={styles.optionBody}>
                      <span className={styles.iconChip}>
                        <HomeOutlined />
                      </span>
                      <span className={styles.optionText}>
                        <span className={styles.optionName}>
                          {organization.organizationName}
                          {organization.organizationId ===
                            currentUser?.defaultOrganizationId && (
                            <Tag className={styles.defaultTag}>默认</Tag>
                          )}
                        </span>
                        <span className={styles.optionMeta}>
                          {organization.organizationCode}
                        </span>
                      </span>
                    </div>
                  </Radio>
                ))}
              </Radio.Group>
              <Button
                className={authStyles.submit}
                disabled={!selectedKey}
                loading={submitting}
                onClick={handleSubmit}
                size="large"
                type="primary"
                block
              >
                进入首页
              </Button>
            </>
          ) : (
            <>
              <Empty description="暂无可选登录入口" />
              <Button
                className={authStyles.submit}
                disabled
                size="large"
                type="primary"
                block
              >
                进入首页
              </Button>
            </>
          )}
          <div className={authStyles.login}>
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

export default SelectEntry;
