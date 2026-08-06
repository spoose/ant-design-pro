import { createStyles } from 'antd-style';

const useAiAssistantStyles = createStyles(({ css, token }) => ({
  pageRoot: css`
    width: 100%;
    min-width: 0;
    min-height: 100%;
    padding: ${token.paddingLG}px;
    overflow-x: hidden;
    background: ${token.colorBgLayout};
  `,

  workbench: css`
    display: flex;
    width: 100%;
    height: max(560px, calc(100vh - 154px));
    min-height: 560px;
    overflow: hidden;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    margin-bottom: ${token.marginLG}px;
  `,

  sidebar: css`
    overflow: hidden;
    background: ${token.colorBgContainer};
    border-inline-end: 1px solid ${token.colorBorderSecondary};

    .ant-layout-sider-children {
      width: var(--pai-conversation-sidebar-width);
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    &.ant-layout-sider-collapsed {
      border-inline-end: 0;
    }
  `,

  sidebarHeader: css`
    padding: ${token.padding}px ${token.padding}px ${token.paddingXS}px;
    display: flex;
    align-items: flex-start;
    gap: ${token.marginXS}px;
  `,

  sidebarHeaderContent: css`
    min-width: 0;
    flex: 1;
  `,

  sidebarTitle: css`
    margin: 0;
    color: ${token.colorTextHeading};
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
  `,

  sidebarDescription: css`
    margin: ${token.marginXXS}px 0 0;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    line-height: ${token.lineHeightSM};
  `,

  conversations: css`
    flex: 1;
    min-height: 0;
    padding: ${token.paddingXS}px;
    overflow-y: auto;
  `,

  main: css`
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    background: ${token.colorBgContainer};
  `,

  mainHeader: css`
    min-height: 56px;
    padding: ${token.paddingSM}px ${token.padding}px;
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,

  activeTitle: css`
    min-width: 0;
    margin: 0;
    flex: 1;
    overflow: hidden;
    color: ${token.colorTextHeading};
    font-size: ${token.fontSize}px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,

  mobileConversationButton: css`
    display: none;
    flex: none;
  `,

  desktopConversationButton: css`
    flex: none;
  `,

  messages: css`
    min-height: 0;
    flex: 1;
    overflow-y: hidden;
    padding: ${token.paddingLG}px;

    .ant-bubble-list {
      width: min(100%, 840px);
      height: 100%;
      margin: 0 auto;
    }
  `,

  failureMessage: css`
    display: block;
    margin-block-start: ${token.marginXS}px;

    &:first-child {
      margin-block-start: 0;
    }
  `,

  sourceDot: css`
    width: 6px;
    height: 6px;
    margin-inline-end: ${token.marginXXS}px;
    display: inline-block;
    background: ${token.colorPrimary};
    border-radius: 50%;
  `,

  emptyState: css`
    box-sizing: border-box;
    width: min(100%, 760px);
    height: 100%;
    min-height: 0;
    margin: 0 auto;
    padding: ${token.paddingXL}px ${token.padding}px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  `,

  emptyContent: css`
    width: 100%;
    margin-block: auto;
  `,

  emptyIcon: css`
    width: 48px;
    height: 48px;
    margin-bottom: ${token.margin}px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorPrimary};
    font-size: 24px;
    background: ${token.colorPrimaryBg};
    border-radius: ${token.borderRadiusLG}px;
  `,

  emptyTitle: css`
    margin: 0;
    color: ${token.colorTextHeading};
    font-size: 24px;
    font-weight: 600;
    line-height: 1.35;
  `,

  emptyDescription: css`
    max-width: 56ch;
    margin: ${token.marginXS}px 0 ${token.marginLG}px;
    color: ${token.colorTextSecondary};
    line-height: ${token.lineHeight};
  `,

  senderArea: css`
    padding: ${token.padding}px ${token.paddingLG}px ${token.paddingSM}px;
    border-top: 1px solid ${token.colorBorderSecondary};
  `,

  senderInner: css`
    width: min(100%, 840px);
    margin: 0 auto;
  `,

  senderFooter: css`
    min-height: ${token.controlHeight}px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${token.marginSM}px;
  `,

  senderFooterStart: css`
    min-width: 0;
    display: flex;
    align-items: center;
    gap: ${token.marginXXS}px;
  `,

  capabilityButton: css`
    color: ${token.colorTextSecondary};
    background: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;

    &:hover,
    &:active {
      color: ${token.colorText};
      background: transparent !important;
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }
  `,

  capabilityOptions: css`
    min-width: 168px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,

  capabilityOption: css`
    box-sizing: border-box;
    width: 100%;
    min-height: 36px;
    margin: 0;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: ${token.colorText};
    font: inherit;
    text-align: start;
    background: transparent;
    border: 0;
    border-radius: ${token.borderRadius}px;
    cursor: pointer;
    transition: background-color 150ms ease-out;

    &:hover:not(:disabled) {
      background: ${token.colorFillTertiary};
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 1px;
    }

    &:disabled {
      color: ${token.colorTextDisabled};
      cursor: not-allowed;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `,

  capabilityOptionIcon: css`
    flex: none;
    width: 16px;
    color: ${token.colorText};
    font-size: 16px;
    line-height: 1;
  `,

  capabilityOptionTitle: css`
    min-width: 0;
    flex: 1;
    font-size: ${token.fontSize}px;
    font-weight: 400;
    line-height: 22px;
  `,

  capabilityOptionCheck: css`
    flex: none;
    color: ${token.colorText};
    font-size: 12px;
    line-height: 1;
  `,

  capabilityTag: css`
    height: 28px;
    margin-inline-end: 0;
    padding-inline: ${token.paddingXS}px;
    display: inline-flex;
    flex: none;
    align-items: center;
    border-radius: 999px;

    .ant-tag-close-icon {
      color: inherit;
      opacity: 0.65;
    }

    .ant-tag-close-icon:hover {
      color: inherit;
      opacity: 1;
    }
  `,

  capabilitySeparator: css`
    flex: none;
    color: ${token.colorBorder};
    line-height: 1;
    user-select: none;
  `,

  disclaimer: css`
    margin: ${token.marginXS}px 0 0;
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
    text-align: center;
  `,

  drawerBody: css`
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `,

  '@media (max-width: 768px)': {
    pageRoot: css`
      padding: ${token.padding}px;
    `,

    workbench: css`
      height: max(560px, calc(100vh - 144px));
      min-height: 560px;
      border-radius: ${token.borderRadius}px;
    `,

    sidebar: css`
      display: none;
    `,

    mobileConversationButton: css`
      display: inline-flex;
    `,

    desktopConversationButton: css`
      display: none;
    `,

    messages: css`
      padding: ${token.padding}px;
    `,

    emptyState: css`
      padding-block: ${token.paddingXL}px;
    `,

    emptyContent: css`
      margin-block: 0;
    `,

    emptyTitle: css`
      font-size: 21px;
    `,

    senderArea: css`
      padding: ${token.paddingSM}px;
    `,
  },
}));

export default useAiAssistantStyles;
