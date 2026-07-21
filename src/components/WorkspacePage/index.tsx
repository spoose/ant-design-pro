import { Breadcrumb } from 'antd';
import type { ReactNode } from 'react';
import { useId } from 'react';
import useWorkspacePageStyles from './style';

export type WorkspacePageProps = {
  /** 页面层级文字，来源于当前 Platform/Organization/App 路由。 */
  breadcrumb: string[];
  /** 当前路由的页面标题。 */
  title: string;
  /** 解释页面用途的简短说明，控制在一行到两行。 */
  description: string;
  /** 页面级操作或状态标识；不存在时标题区保持自然宽度。 */
  actions?: ReactNode;
  /** 页面主体，统一落入从 demo 提取的 24px 内容区。 */
  children: ReactNode;
};

/**
 * 正式 Workspace 页面的统一视觉框架。
 * 只负责 demo 已确认的标题区、面包屑和内容间距，不持有路由或标签状态。
 */
const WorkspacePage = ({
  breadcrumb,
  title,
  description,
  actions,
  children,
}: WorkspacePageProps) => {
  const { styles } = useWorkspacePageStyles();
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <Breadcrumb items={breadcrumb.map((item) => ({ title: item }))} />
          <h1 className={styles.title} id={titleId}>
            {title}
          </h1>
          <p className={styles.description}>{description}</p>
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
};

export default WorkspacePage;
