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
  `,

  heading: css`
    min-height: 132px;
    padding: ${token.paddingLG}px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: ${token.marginLG}px;
    background: ${token.colorBgContainer};
    border-bottom: 1px solid ${token.colorBorderSecondary};
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
      background: ${token.colorBgContainer};
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

    actions: css`
      justify-content: flex-end;
    `,

    body: css`
      padding: ${token.padding}px;
    `,
  },
}));

export default useWorkspacePageStyles;
