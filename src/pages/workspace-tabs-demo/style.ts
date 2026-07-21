import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css, token }) => ({
  appShell: css`
    height: 100vh;
    min-height: 600px;
    overflow: hidden;
    color: ${token.colorText};
    font-family: ${token.fontFamily};
    background: ${token.colorBgLayout};
  `,

  skipLink: css`
    position: fixed;
    top: ${token.marginSM}px;
    left: ${token.marginSM}px;
    z-index: 20;
    padding: ${token.paddingXS}px ${token.paddingSM}px;
    color: ${token.colorTextLightSolid};
    background: ${token.colorPrimary};
    border-radius: ${token.borderRadius}px;
    transform: translateY(-160%);

    &:focus {
      transform: translateY(0);
    }
  `,

  globalHeader: css`
    height: 56px;
    padding: 0 ${token.paddingLG}px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${token.marginLG}px;
    background: ${token.colorBgContainer};
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,

  brand: css`
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: ${token.marginSM}px;
    flex: none;

    img {
      width: 28px;
      height: 28px;
      display: block;
    }

    strong {
      color: ${token.colorTextHeading};
      font-size: ${token.fontSizeLG}px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
  `,

  headerMeta: css`
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: ${token.margin}px;
    color: ${token.colorTextSecondary};
  `,

  workspaceEntry: css`
    width: 32px;
    height: 32px !important;
    padding: 0 !important;
    color: ${token.colorText};
    font-size: ${token.fontSizeLG}px;
    border-radius: ${token.borderRadius}px;
  `,

  headerIcon: css`
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeLG}px;
  `,

  userAvatar: css`
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    color: ${token.colorPrimary};
    font-weight: 600;
    background: ${token.colorPrimaryBg};
    border: 1px solid ${token.colorPrimaryBorder};
    border-radius: 50%;
  `,

  userName: css`
    overflow: hidden;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSize}px;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,

  workspaceRail: css`
    height: 44px;
    background: ${token.colorBgContainer};
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,

  workspaceTabs: css`
    height: 44px;
    background: ${token.colorBgContainer};

    > .ant-tabs-nav {
      height: 44px;
      margin: 0;
      padding: 0 ${token.padding}px;

      &::before {
        border-bottom: 0;
      }

      .ant-tabs-nav-wrap {
        min-width: 0;
      }

      .ant-tabs-tab {
        height: 44px;
        margin: 0;
        padding: 0 ${token.paddingSM}px;
        display: inline-flex;
        align-items: center;
        background: transparent;
        border: 0;
        border-right: 1px solid ${token.colorBorderSecondary};
        border-radius: 0;
        border-bottom: 2px solid transparent;
        transition:
          color ${token.motionDurationFast},
          background ${token.motionDurationFast},
          border-color ${token.motionDurationFast};

        &:hover {
          background: ${token.colorFillTertiary};
        }

        &.ant-tabs-tab-active {
          background: ${token.colorPrimaryBg};
          border-bottom-color: ${token.colorPrimary};
        }

        .ant-tabs-tab-btn:focus-visible,
        .ant-tabs-tab-remove:focus-visible {
          outline: 2px solid ${token.colorPrimaryBorder};
          outline-offset: 2px;
          border-radius: ${token.borderRadiusSM}px;
        }

        .ant-tabs-tab-remove {
          width: 28px;
          height: 28px;
          margin-inline-start: ${token.marginXS}px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: ${token.colorTextQuaternary};

          &:hover {
            color: ${token.colorText};
            background: ${token.colorFillSecondary};
          }
        }
      }
    }

    > .ant-tabs-content-holder {
      display: none;
    }
  `,

  tabLabel: css`
    display: inline-flex;
    align-items: center;
    gap: ${token.marginXS}px;
    line-height: 1;
  `,

  systemBadge: css`
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorPrimary};
    font-size: ${token.fontSizeSM}px;
    font-weight: 700;
    letter-spacing: -0.2px;
    background: ${token.colorPrimaryBg};
    border: 1px solid ${token.colorPrimaryBorder};
    border-radius: ${token.borderRadiusSM}px;
  `,

  workArea: css`
    height: calc(100vh - 56px);
    min-height: 544px;
    background: ${token.colorBgLayout};
  `,

  mainColumn: css`
    min-width: 0;
    min-height: 0;
    background: ${token.colorBgLayout};
  `,

  sider: css`
    position: relative;
    overflow: hidden;
    background: ${token.colorBgContainer} !important;
    border-right: 1px solid ${token.colorBorderSecondary};

    .ant-layout-sider-children {
      min-height: 100%;
      display: flex;
      flex-direction: column;
    }
  `,

  sidebarHeader: css`
    height: 44px;
    padding: 0 ${token.paddingSM - token.paddingXXS}px;
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
    flex: none;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,

  sidebarContext: css`
    min-width: 0;
    padding: 0 ${token.paddingXXS}px;
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
    flex: 1;
    overflow: hidden;

    strong {
      overflow: hidden;
      color: ${token.colorText};
      font-size: ${token.fontSize}px;
      font-weight: 600;
      line-height: 22px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,

  collapseButton: css`
    width: 40px !important;
    min-width: 40px !important;
    height: 44px !important;
    padding: 0 !important;
    flex: none;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeLG}px;
    border-radius: ${token.borderRadius}px;

    .ant-layout-sider-collapsed & {
      margin: 0 auto;
    }
  `,

  sidebarMenu: css`
    padding: ${token.paddingXS}px;
    flex: 1;
    overflow-y: auto;
    background: transparent;
    border-inline-end: 0 !important;

    .ant-menu-item {
      height: 40px;
      min-height: 40px;
      margin-inline: 0;
      margin-block: 2px;
      width: 100%;
      border-radius: ${token.borderRadius}px;
    }

  `,

  permissionScope: css`
    margin: ${token.marginSM}px;
    padding: ${token.paddingSM}px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: none;
    background: ${token.colorFillQuaternary};
    border-radius: ${token.borderRadius}px;

    span,
    small {
      color: ${token.colorTextTertiary};
      font-size: ${token.fontSizeSM}px;
    }

    strong {
      color: ${token.colorText};
      font-size: ${token.fontSizeSM}px;
      font-weight: 600;
    }
  `,

  content: css`
    min-width: 0;
    overflow: auto;
    background: ${token.colorBgLayout};
  `,

  contentViewport: css`
    min-width: 0;
    min-height: 100%;
    background: ${token.colorBgLayout};
  `,

  pageHeading: css`
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

  pageTitle: css`
    margin: ${token.marginSM}px 0 0;
    color: ${token.colorTextHeading};
    font-size: 24px;
    font-weight: 600;
    line-height: 1.35;
  `,

  pageDescription: css`
    max-width: 65ch;
    margin: ${token.marginXS}px 0 0;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSize}px;
    line-height: ${token.lineHeight};
  `,

  pageActions: css`
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
    flex: none;
  `,

  pageBody: css`
    padding: ${token.paddingLG}px;
    background: ${token.colorBgLayout};

    .ant-table-wrapper {
      background: ${token.colorBgContainer};
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

  filterSummary: css`
    min-height: 48px;
    padding: 0 ${token.padding}px;
    display: flex;
    align-items: center;
    gap: ${token.marginXL}px;
    overflow-x: auto;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSize}px;
    white-space: nowrap;
    background: ${token.colorBgContainer};
    border-bottom: 1px solid ${token.colorBorderSecondary};

    > span {
      height: 48px;
      display: inline-flex;
      align-items: center;
      border-bottom: 2px solid transparent;
    }
  `,

  filterActive: css`
    color: ${token.colorPrimary};
    font-weight: 500;
    border-bottom-color: ${token.colorPrimary} !important;
  `,

  status: css`
    display: inline-flex;
    align-items: center;
    gap: ${token.marginXS}px;
    white-space: nowrap;
  `,

  statusDot: css`
    width: 6px;
    height: 6px;
    display: inline-block;
    border-radius: 50%;
    background: ${token.colorTextQuaternary};
  `,

  statusPending: css`
    background: ${token.colorWarning};
  `,

  statusWorking: css`
    background: ${token.colorPrimary};
  `,

  statusSuccess: css`
    background: ${token.colorSuccess};
  `,

  sectionTitle: css`
    margin: 0 0 ${token.margin}px;
    color: ${token.colorTextHeading};
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
  `,

  applicationList: css`
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
  `,

  applicationItem: css`
    min-height: 80px;
    padding: ${token.padding}px;
    display: flex;
    align-items: center;
    gap: ${token.margin}px;

    & + & {
      border-top: 1px solid ${token.colorBorderSecondary};
    }
  `,

  applicationIcon: css`
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    color: ${token.colorPrimary};
    font-size: ${token.fontSizeLG}px;
    background: ${token.colorPrimaryBg};
    border: 1px solid ${token.colorPrimaryBorder};
    border-radius: ${token.borderRadius}px;
  `,

  applicationCode: css`
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    background: ${token.colorFillQuaternary};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
  `,

  applicationCopy: css`
    min-width: 0;
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;

    strong {
      color: ${token.colorText};
      font-weight: 500;
    }

    span {
      overflow: hidden;
      color: ${token.colorTextSecondary};
      font-size: ${token.fontSizeSM}px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,

  secondaryLabel: css`
    flex: none;
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
  `,

  '@media (max-width: 768px)': {
    globalHeader: css`
      height: 52px;
      padding: 0 ${token.padding}px;
    `,

    workspaceRail: css`
      height: 44px;
    `,

    workspaceTabs: css`
      height: 44px;

      > .ant-tabs-nav {
        height: 44px;
        padding: 0 ${token.paddingXS}px;

        .ant-tabs-tab {
          height: 44px;
        }
      }
    `,

    sidebarHeader: css`
      height: 44px;
    `,

    workArea: css`
      height: calc(100vh - 52px);
    `,

    workspaceEntry: css`
      display: none;
    `,

    pageHeading: css`
      padding: ${token.padding}px;
      align-items: stretch;
      flex-direction: column;
    `,

    pageActions: css`
      justify-content: flex-end;
    `,

    pageBody: css`
      padding: ${token.padding}px;
    `,

    applicationItem: css`
      align-items: flex-start;
      flex-wrap: wrap;
    `,

    applicationCopy: css`
      min-width: calc(100% - 56px);
    `,
  },

  '@media (max-width: 520px)': {
    brand: css`
      strong {
        display: none;
      }
    `,

    headerIcon: css`
      display: none;
    `,

    userName: css`
      max-width: 88px;
    `,
  },

  '@media (prefers-reduced-motion: reduce)': {
    workspaceTabs: css`
      .ant-tabs-tab {
        transition: none;
      }
    `,
  },
}));
