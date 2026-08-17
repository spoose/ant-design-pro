import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token }) => {
  return {
    description: {
      maxWidth: '65ch',
      color: token.colorText,
      fontSize: token.fontSize,
      fontWeight: 400,
      lineHeight: token.lineHeight,
      letterSpacing: 0,
      textWrap: 'pretty',
    },
    extra: {
      display: 'flex',
      gap: token.marginSM,
      alignItems: 'center',
      marginTop: token.marginMD,
      color: token.colorTextSecondary,
      fontSize: token.fontSizeSM,
      fontWeight: 500,
      lineHeight: token.lineHeightSM,
      letterSpacing: 0,
      '& > a': {
        color: token.colorTextSecondary,
        fontWeight: 500,
      },
      '& > em': {
        color: token.colorTextTertiary,
        fontStyle: 'normal',
        fontWeight: 400,
      },
      [`@media screen and (max-width: ${token.screenXS}px)`]: {
        flexWrap: 'wrap',
        '& > em': {
          display: 'block',
          width: '100%',
          marginTop: token.marginXS,
          marginLeft: 0,
        },
      },
    },
  };
});

export default useStyles;
