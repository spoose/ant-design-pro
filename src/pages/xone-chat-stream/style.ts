import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css, token }) => ({
  page: css`
    max-width: 1440px;
    margin: 0 auto;
  `,
  notice: css`
    margin-bottom: ${token.marginLG}px;
  `,
  grid: css`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${token.marginLG}px;
  `,
  configuration: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginMD}px;
  `,
  field: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginXXS}px;
  `,
  fieldLabel: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    font-weight: 500;
  `,
  endpoint: css`
    padding: ${token.paddingXS}px ${token.paddingSM}px;
    overflow-wrap: anywhere;
    color: ${token.colorText};
    font-family: ${token.fontFamilyCode};
    font-size: ${token.fontSizeSM}px;
    background: ${token.colorFillTertiary};
    border-radius: ${token.borderRadiusSM}px;
  `,
  actions: css`
    display: flex;
    flex-wrap: wrap;
    gap: ${token.marginXS}px;
    padding-top: ${token.paddingXS}px;
  `,
  chatCard: css`
    min-width: 0;
  `,
  chatBody: css`
    display: flex;
    min-height: 560px;
    flex-direction: column;
    gap: ${token.marginMD}px;
  `,
  messages: css`
    min-height: 390px;
    max-height: 58vh;
    flex: 1;
    padding: ${token.paddingMD}px;
    overflow: auto;
    background: ${token.colorFillQuaternary};
    border-radius: ${token.borderRadiusLG}px;
  `,
  empty: css`
    display: grid;
    min-height: 350px;
    place-items: center;
    color: ${token.colorTextTertiary};
    text-align: center;
  `,
  sender: css`
    flex: none;
  `,
  logs: css`
    grid-column: 1 / -1;
  `,
  logOutput: css`
    min-height: 180px;
    max-height: 320px;
    margin: 0;
    padding: ${token.paddingMD}px;
    overflow: auto;
    color: ${token.colorText};
    font-family: ${token.fontFamilyCode};
    font-size: ${token.fontSizeSM}px;
    line-height: 1.65;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background: ${token.colorBgLayout};
    border-radius: ${token.borderRadiusSM}px;
  `,
}));
