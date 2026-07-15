import { InteractionOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import type { MenuProps } from 'antd';
import { Button } from 'antd';
import { startTransition } from 'react';
import { setCurrentContextId } from '@/utils/currentContext';
import HeaderDropdown from '../HeaderDropdown';
import useHeaderActionStyles from './style';

export const SysSwitch: React.FC = () => {
  const { styles } = useHeaderActionStyles();
  const { initialState, setInitialState } = useModel('@@initialState');
  // contexts 来自 GET /api/currentUser，在当前登录生命周期内由 Umi initialState 共享。
  const contexts = initialState?.currentUser?.contexts ?? [];
  const currentContext = contexts.find(
    (context) => context.id === initialState?.currentContextId,
  );

  const handleSwitch: MenuProps['onClick'] = ({ key }) => {
    //select current props
    if (key === currentContext?.id) return;

    const nextContext = contexts.find((context) => context.id === key);
    if (!nextContext) return;

    setCurrentContextId(nextContext.id);
    startTransition(() => {
      setInitialState((state) => ({
        ...state,
        currentContextId: nextContext.id,
      }));
    });
  };

  const items: MenuProps['items'] = contexts.length
    ? contexts.map((context) => ({
        key: context.id,
        label: context.scopeName
          ? `${context.systemName} · ${context.scopeName}`
          : context.systemName,
      }))
    : [{ key: 'empty', label: '暂无可用系统', disabled: true }];

  return (
    <HeaderDropdown
      placement="bottomRight"
      arrow
      trigger={['click']}
      menu={{
        selectedKeys: currentContext ? [currentContext.id] : [],
        onClick: handleSwitch,
        items,
        style: { minWidth: 180 },
      }}
    >
      <Button
        aria-label="切换系统"
        className={styles.action}
        icon={<InteractionOutlined />}
        type="text"
      >
        {currentContext?.systemName ?? '选择系统'}
      </Button>
    </HeaderDropdown>
  );
};
