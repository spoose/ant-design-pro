import { createStyles } from 'antd-style';

const useUsageInsightStyles = createStyles(({ css, token }) => ({
  root: css`
    min-width: 0;
  `,

  innerCard: css`
    display: grid;
    gap: ${token.marginSM}px;
    min-width: 0;
  `,

  metrics: css`
    display: flex;
    align-items: flex-end;
    gap: ${token.marginLG}px;
  `,

  metric: css`
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 4px;
  `,

  metricLabel: css`
    display: flex;
    align-items: center;
    gap: 6px;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    line-height: 1.5;
  `,

  metricDelta: css`
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
    line-height: 1.25;
    font-variant-numeric: tabular-nums;
  `,

  metricValue: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
  `,

  well: css`
    overflow: hidden;
    border-radius: ${token.borderRadius}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
  `,

  wellBar: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${token.marginSM}px;
    padding: 8px 12px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
  `,

  chartStage: css`
    position: relative;
    display: flex;
    flex-direction: column;
    height: 166px;

    /* Liveline series chips use inline display:flex; hide them so page 1
       does not show dead 输入/输出 toggles above the canvas. */
    > div:first-of-type:not(:last-of-type) {
      display: none !important;
    }

    > div:last-of-type {
      flex: 1 1 0;
      min-height: 0;
      height: auto !important;
    }
  `,

  chartCursor: css`
    position: absolute;
    top: 8px;
    bottom: 32px;
    width: 1px;
    transform: translateX(-50%);
    background: ${token.colorBorder};
    pointer-events: none;
  `,

  chartTooltipAnchor: css`
    position: absolute;
    top: 10px;
    transform: translateX(-50%);
    pointer-events: none;
    z-index: 1;
  `,

  chartTooltip: css`
    min-width: 9rem;
    padding: 8px 10px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    box-shadow: ${token.boxShadowSecondary};
  `,

  chartTooltipTime: css`
    display: block;
    margin-bottom: 6px;
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
    line-height: 1.5;
  `,

  chartTooltipRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: ${token.colorText};
    font-size: ${token.fontSizeSM}px;
    line-height: 1.5;

    & + & {
      margin-top: 4px;
    }

    strong {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
  `,

  chartTooltipLabel: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: ${token.colorTextSecondary};
  `,

  chartTooltipDot: css`
    width: 6px;
    height: 6px;
    flex-shrink: 0;
    border-radius: 999px;
  `,
}));

export default useUsageInsightStyles;
