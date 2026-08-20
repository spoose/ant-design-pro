import { createStyles } from 'antd-style';

/** 从 workspace-tabs-demo 提取的正式页面结构样式。 */
const useWorkspacePageStyles = createStyles(({ css, token }) => ({
  page: css`
    width: 100%;
    min-width: 0;
    max-width: 100%;
    min-height: 100%;
    overflow-x: hidden;
    background: ${token.colorBgLayout};
    /* 圆角改由 .ant-pro-layout-content 滚动容器裁剪提供，滚动时弧度常驻。 */
  `,

  heading: css`
    min-height: 132px;
    padding: ${token.paddingLG}px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: ${token.marginLG}px;
    background: ${token.colorBgLayout};
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,

  /** 工作台欢迎区：与内容区卡片同壳（白底、描边、圆角、左右留白对齐）。 */
  headingCard: css`
    min-height: auto;
    margin: 0 ${token.paddingLG}px;
    padding: ${token.padding}px ${token.paddingLG}px;
    align-items: center;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
  `,

  breadcrumb: css`
    padding: ${token.padding}px ${token.paddingLG}px ${token.paddingXS}px;
  `,

  headingMain: css`
    min-width: 0;
  `,

  headingMainWithLeading: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginSM}px;
    min-width: 0;
  `,

  headingRow: css`
    display: flex;
    align-items: center;
    gap: ${token.marginMD}px;
    min-width: 0;
  `,

  leading: css`
    flex: none;
  `,

  headingCopy: css`
    min-width: 0;
  `,

  title: css`
    margin: ${token.marginSM}px 0 0;
    color: ${token.colorTextHeading};
    font-size: 24px;
    font-weight: 600;
    line-height: 1.35;
    text-wrap: balance;
  `,

  titleWithLeading: css`
    margin-top: 0;
  `,

  description: css`
    max-width: 65ch;
    margin: ${token.marginXS}px 0 0;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSize}px;
    line-height: ${token.lineHeight};
    text-wrap: pretty;
  `,

  actions: css`
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
    flex: none;
  `,

  body: css`
    width: 100%;
    min-width: 0;
    max-width: 100%;
    padding: ${token.paddingLG}px;
    overflow-x: hidden;
    background: ${token.colorBgLayout};

    .ant-table-wrapper {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
      background: ${token.colorBgLayout};
    }

    .ant-table-content {
      max-width: 100%;
      overflow-x: auto !important;
    }

    .ant-table-thead > tr > th {
      color: ${token.colorTextSecondary};
      font-weight: 500;
      background: ${token.colorFillQuaternary};
    }

    .ant-table-tbody > tr > td {
      height: 56px;
    }

    .ant-pagination {
      margin-inline: ${token.margin}px;
    }
  `,

  '@media (max-width: 768px)': {
    heading: css`
      min-height: auto;
      padding: ${token.padding}px;
      align-items: stretch;
      flex-direction: column;
    `,

    headingCard: css`
      margin: 0 ${token.padding}px;
      padding: ${token.padding}px;
    `,

    breadcrumb: css`
      padding: ${token.padding}px ${token.padding}px ${token.paddingXXS}px;
    `,

    headingMainWithLeading: css`
      gap: ${token.marginXS}px;
    `,

    headingRow: css`
      align-items: flex-start;
    `,

    actions: css`
      justify-content: flex-end;
    `,

    body: css`
      padding: ${token.padding}px;
    `,
  },
}));

export default useWorkspacePageStyles;
