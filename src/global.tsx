import '../tailwind.css';
import {
  applyWorkspaceBackground,
  readWorkspaceBackground,
} from '@/utils/workspaceAppearance';

// 首帧前同步一次，避免从默认底色闪到用户上次选择的底色。
applyWorkspaceBackground(readWorkspaceBackground());
