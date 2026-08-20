import { Breadcrumb } from 'antd';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { useId } from 'react';
import useWorkspacePageStyles from './style';

export type WorkspacePageProps = {
  /** 页面层级文字，来源于当前 Platform/Organization/App 路由。 */
  breadcrumb: string[];
  /** 当前路由的页面标题。 */
  title: string;
  /** 解释页面用途的简短说明；空字符串时不渲染说明行。 */
  description?: string;
  /** 标题区左侧内容，例如工作台欢迎头像。 */
  leading?: ReactNode;
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
  leading,
  actions,
  children,
}: WorkspacePageProps) => {
  const { styles } = useWorkspacePageStyles();
  const titleId = useId();

  const crumb = (
    <Breadcrumb items={breadcrumb.map((item) => ({ title: item }))} />
  );

  return (
    <section aria-labelledby={titleId} className={styles.page}>
      {leading ? <div className={styles.breadcrumb}>{crumb}</div> : null}
      <header className={clsx(styles.heading, leading && styles.headingCard)}>
        <div
          className={
            leading ? styles.headingMainWithLeading : styles.headingMain
          }
        >
          {leading ? (
            <div className={styles.headingRow}>
              <div className={styles.leading}>{leading}</div>
              <div className={styles.headingCopy}>
                <h1
                  className={clsx(styles.title, styles.titleWithLeading)}
                  id={titleId}
                >
                  {title}
                </h1>
                {description ? (
                  <p className={styles.description}>{description}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className={styles.headingCopy}>
              {crumb}
              <h1 className={styles.title} id={titleId}>
                {title}
              </h1>
              {description ? (
                <p className={styles.description}>{description}</p>
              ) : null}
            </div>
          )}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
};

export default WorkspacePage;
