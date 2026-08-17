import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token }) => {
  return {
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
    listItemExtra: {
      width: '272px',
      height: '1px',
      [`@media screen and (max-width: ${token.screenLG}px)`]: {
        width: '0',
        height: '1px',
      },
    },
    selfTrigger: {
      marginLeft: token.marginSM,
      [`@media screen and (max-width: ${token.screenXS}px)`]: {
        display: 'block',
        marginLeft: 0,
      },
      [`@media screen and (max-width: ${token.screenMD}px)`]: {
        display: 'block',
        marginLeft: 0,
      },
    },
  };
});

export default useStyles;
