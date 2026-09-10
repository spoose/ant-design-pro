import { Drawer, Segmented } from 'antd';
import { useState } from 'react';
import { surfaceColors } from '@/theme/colors';
import {
  applyWorkspaceBackground,
  normalizeWorkspaceBackground,
  readWorkspaceBackground,
  type WorkspaceBackground,
  writeWorkspaceBackground,
} from '@/utils/workspaceAppearance';

type WorkspaceThemeDrawerProps = {
  open: boolean;
  onClose: () => void;
};

/** 色块只作视觉提示；选项自带文字名称，不靠颜色单独传达信息。 */
const BackgroundOption = ({
  color,
  label,
}: {
  color: string;
  label: string;
}) => (
  <span className="inline-flex items-center gap-2">
    <span
      aria-hidden="true"
      className="size-4 rounded-full border border-zinc-400 dark:border-zinc-500"
      style={{ backgroundColor: color }}
    />
    {label}
  </span>
);

const backgroundOptions = [
  {
    value: 'classic',
    label: <BackgroundOption color={surfaceColors.pageClassic} label="默认" />,
  },
  {
    value: 'cool',
    label: <BackgroundOption color={surfaceColors.pageCool} label="冷灰蓝" />,
  },
];

/** 头像菜单「主题设置」的落点；后续外观项继续加在这里。 */
const WorkspaceThemeDrawer = ({ open, onClose }: WorkspaceThemeDrawerProps) => {
  const [background, setBackground] = useState<WorkspaceBackground>(
    readWorkspaceBackground,
  );

  const changeBackground = (value: string | number) => {
    const next = normalizeWorkspaceBackground(value);
    setBackground(next);
    writeWorkspaceBackground(next);
    applyWorkspaceBackground(next);
  };

  return (
    <Drawer onClose={onClose} open={open} size={360} title="主题设置">
      <section
        aria-labelledby="workspace-background-title"
        className="grid gap-3"
      >
        <div className="grid gap-1">
          <h3
            className="m-0 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            id="workspace-background-title"
          >
            工作台背景
          </h3>
          <p className="m-0 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            影响工作台、组织首页、管理页与 xOneAI；通知中心保持自己的白底。
          </p>
        </div>
        <Segmented
          aria-label="工作台背景"
          block
          onChange={changeBackground}
          options={backgroundOptions}
          value={background}
        />
      </section>
    </Drawer>
  );
};

export default WorkspaceThemeDrawer;
