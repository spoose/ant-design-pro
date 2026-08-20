import { createStyles } from 'antd-style';
import { surfaceColors } from '@/theme/colors';

/** 顶栏标签：hover / 选中为低饱和浅蓝。 */
const useWorkspaceTabsBarStyles = createStyles(({ css, token }) => ({
  rail: css`
    width: 100%;
    min-width: 0;
    height: 100%;
    display: flex;
    align-items: center;
    overflow: hidden;
    background: transparent;
  `,

  tabs: css`
    width: 100%;
    min-width: 0;
    height: 36px;

    > .ant-tabs-nav {
      height: 100%;
      margin: 0;
      padding: 0 ${token.paddingXS}px;
      align-items: center;

      &::before {
        border-bottom: 0;
      }

      .ant-tabs-nav-wrap {
        min-width: 0;
      }

      .ant-tabs-nav-list {
        gap: ${token.marginXXS}px;
      }

      .ant-tabs-tab {
        position: relative;
        height: 100%;
        margin: 0;
        padding: 0 ${token.paddingXS}px;
        display: inline-flex;
        align-items: center;
        background: transparent;
        border: 0;
        border-radius: ${token.borderRadiusLG}px;
        transition:
          color ${token.motionDurationFast},
          background ${token.motionDurationFast};

        &:hover:not(.ant-tabs-tab-active) {
          background: ${surfaceColors.navChromeRaised};
        }

        &.ant-tabs-tab-active {
          background: ${surfaceColors.navChromeRaised};

          .ant-tabs-tab-btn {
             color: ${surfaceColors.navActiveInk};
          }

          &::after {
            content: '';
            position: absolute;
            right: ${token.paddingXS}px;
            bottom: 0;
            left: ${token.paddingXS}px;
            height: 2px;
            background: ${surfaceColors.navActiveInk};
            border-radius: 1px;
          }
        }

        .ant-tabs-tab-btn {
          height: 100%;
          display: inline-flex;
          align-items: center;
          gap: ${token.marginXXS}px;

          .ant-tabs-tab-icon {
            display: inline-flex;
            flex: none;
            align-items: center;
            justify-content: center;
            line-height: 1;
          }

          .ant-tabs-tab-icon:not(:last-child) {
            margin-inline-end: 0;
          }
        }

        .ant-tabs-tab-btn:focus-visible,
        .ant-tabs-tab-remove:focus-visible {
          border-radius: ${token.borderRadiusSM}px;
          outline: 2px solid ${token.colorPrimaryBorder};
          outline-offset: 2px;
        }

        .ant-tabs-tab-remove {
          width: 24px;
          height: 24px;
          margin-inline-start: ${token.marginXXS}px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          color: ${token.colorTextQuaternary};
          border-radius: ${token.borderRadiusSM}px;
          transition:
            opacity ${token.motionDurationFast},
            color ${token.motionDurationFast},
            background ${token.motionDurationFast};

          &:hover {
            color: ${token.colorText};
            background: ${surfaceColors.navChromeRaised};
          }
        }

        &:hover .ant-tabs-tab-remove,
        &:focus-within .ant-tabs-tab-remove {
          opacity: 1;
          pointer-events: auto;
        }
      }

      .ant-tabs-nav-more {
        width: 36px;
        height: 36px;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: ${token.borderRadiusLG}px;

        &:hover {
          background: ${surfaceColors.navChromeRaised};
        }
      }
    }

    > .ant-tabs-content-holder {
      display: none;
    }

    @media (max-width: 767px) {
      height: 44px;

      > .ant-tabs-nav {
        padding: 0 ${token.paddingXXS}px;

        .ant-tabs-tab {
          min-height: 44px;
          padding-inline: ${token.paddingXS}px;

          .ant-tabs-tab-remove {
            width: 32px;
            height: 32px;
            margin-inline-start: ${token.marginXXS}px;
            position: relative;

            &::after {
              position: absolute;
              inset: -6px;
              content: '';
            }
          }
        }

        .ant-tabs-nav-more {
          width: 44px;
          height: 44px;
        }
      }
    }

    @media (hover: none), (pointer: coarse) {
      > .ant-tabs-nav .ant-tabs-tab .ant-tabs-tab-remove {
        opacity: 1;
        pointer-events: auto;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ant-tabs-tab,
      .ant-tabs-tab-remove {
        transition: none;
      }
    }
  `,

  tabIcon: css`
    width: 1em;
    height: 1em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: ${token.fontSizeLG}px;
    line-height: 1;

    svg {
      display: block;
    }
  `,

  labelText: css`
    max-width: 160px;
    display: inline-flex;
    align-items: center;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${token.fontSize}px;
    line-height: ${token.lineHeight};

    @media (max-width: 767px) {
      max-width: 112px;
    }
  `,
}));

export default useWorkspaceTabsBarStyles;
