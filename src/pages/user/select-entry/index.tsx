import { Helmet, SelectLang, useModel } from '@umijs/max';
import { Alert, Button, Empty, Radio, Spin } from 'antd';
import { createStyles } from 'antd-style';
import React, { startTransition, useEffect, useState } from 'react';
import { Footer } from '@/components';
import Settings from '../../../../config/defaultSettings';
import type { LoginEntry } from './data';
import { queryLoginEntries, selectLoginEntry } from './service';

const homePath = '/welcome';

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
    loading: {
      display: 'flex',
      justifyContent: 'center',
      padding: '48px 0',
    },
  };
});

const Lang = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.lang} data-lang>
      {SelectLang && <SelectLang />}
    </div>
  );
};

const SelectEntry = () => {
  const { styles } = useStyles();
  const { setInitialState } = useModel('@@initialState');
  const [entries, setEntries] = useState<LoginEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadEntries = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const result = await queryLoginEntries();
        if (result.success === false) {
          throw new Error(result.errorMessage ?? '登录入口加载失败');
        }
        if (!Array.isArray(result.data)) {
          throw new Error('登录入口接口未返回列表');
        }
        setEntries(result.data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '登录入口加载失败';
        setErrorMessage(message);
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, []);

  const handleSubmit = async () => {
    if (!selectedEntryId) return;

    setSubmitting(true);
    setErrorMessage('');
    try {
      const result = await selectLoginEntry(selectedEntryId);
      if (result.success === false) {
        throw new Error(result.errorMessage ?? '选择登录入口失败');
      }
      const selectedLoginEntry = result.data;
      if (!selectedLoginEntry) {
        throw new Error('选择登录入口接口未返回入口信息');
      }
      startTransition(() => {
        setInitialState((state) => ({
          ...state,
          selectedLoginEntry,
        }));
      });
      // entryUrl is reserved for future cross-subdomain entry routing.
      window.location.href = homePath;
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
      {/* <Lang /> */}
      <div className={styles.content}>
        <div className={styles.main}>
          <div className={styles.header}>
            {/* <img alt="logo" className={styles.logo} src="/logo.svg" /> */}
            <h1 className={styles.title}>选择登录入口</h1>
            <div className={styles.subtitle}>
              请选择本次登录使用的系统或部门
            </div>
          </div>
          {errorMessage && (
            <Alert
              className={styles.alert}
              showIcon
              title={errorMessage}
              type="error"
            />
          )}
          {loading ? (
            <div className={styles.loading}>
              <Spin />
            </div>
          ) : entries.length > 0 ? (
            <>
              <Radio.Group
                className={styles.radioGroup}
                onChange={(event) => {
                  setSelectedEntryId(event.target.value);
                }}
                value={selectedEntryId}
              >
                {entries.map((entry) => (
                  <Radio
                    className={styles.option}
                    key={entry.id}
                    value={entry.id}
                  >
                    <div className={styles.optionName}>{entry.name}</div>
                    <div className={styles.optionMeta}>
                      {entry.systemName}
                      {entry.code ? ` · ${entry.code}` : ''}
                    </div>
                  </Radio>
                ))}
              </Radio.Group>
              <Button
                className={styles.submit}
                disabled={!selectedEntryId}
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
      {/* <Footer /> */}
    </div>
  );
};

export default SelectEntry;
