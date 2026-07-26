import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token }) => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: token.colorBgLayout,
  },
  lang: {
    width: 42,
    height: 42,
    lineHeight: '42px',
    position: 'fixed',
    right: 16,
    borderRadius: token.borderRadius,
    ':hover': {
      backgroundColor: token.colorBgTextHover,
    },
  },
  content: {
    display: 'flex',
    flex: 1,
    padding: '32px 16px',
  },
  main: {
    width: '100%',
    maxWidth: 400,
    margin: 'auto',
  },
  brand: {
    marginBottom: 32,
    textAlign: 'center',
    h1: {
      margin: '12px 0 4px',
      color: token.colorTextHeading,
      fontSize: 24,
      fontWeight: 600,
      lineHeight: 1.4,
    },
    p: {
      margin: 0,
      color: token.colorTextSecondary,
      fontSize: 14,
    },
  },
  logo: {
    width: 48,
    height: 48,
    display: 'block',
    margin: '0 auto',
  },
  errorAlert: {
    marginBottom: 24,
  },
  submit: {
    height: 40,
    marginTop: 8,
  },
  login: {
    marginTop: 24,
    textAlign: 'center',
    color: token.colorTextSecondary,
  },
}));

export default useStyles;
