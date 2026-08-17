import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token }) => {
  return {
    articleList: {
      '.ant-list-item:first-child': { paddingTop: 0 },
    },
    listItemMetaTitle: {
      color: token.colorTextHeading,
      fontSize: token.fontSizeXL,
      fontWeight: 600,
      lineHeight: token.lineHeightHeading5,
      letterSpacing: 0,
      textWrap: 'balance',
    },
    listItemAction: {
      color: token.colorTextSecondary,
      fontSize: token.fontSizeSM,
      fontWeight: 500,
      lineHeight: token.lineHeightSM,
      letterSpacing: 0,
    },
  };
});

export default useStyles;
