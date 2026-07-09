import {
  ForkOutlined,
  InteractionFilled,
  InteractionOutlined,
  SwitcherFilled,
  SwitcherOutlined,
  SwitcherTwoTone,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button } from 'antd';
import HeaderDropdown from '../HeaderDropdown';
import useHeaderActionStyles from './style';

const sysItems: MenuProps['items'] = [
  { key: 'sys1', label: 'sys1' },
  { key: 'sys2', label: 'sys2' },
];

const onVersionClick: MenuProps['onClick'] = ({ key }) => {
  window.open(key, '_blank', 'noopener,noreferrer');
};

export const SysSwitch: React.FC = () => {
  const { styles } = useHeaderActionStyles();
  return (
    <HeaderDropdown
      placement="bottomRight"
      arrow
      menu={{
        selectedKeys: [],
        onClick: onVersionClick,
        items: sysItems,
        style: { minWidth: 100 },
      }}
    >
      <Button type="text" className={styles.action} aria-label="system name">
        <InteractionOutlined />
      </Button>
    </HeaderDropdown>
  );
};
