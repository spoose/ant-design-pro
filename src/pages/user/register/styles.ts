import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token }) => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#f7f8fa',
  },
  content: {
    display: 'flex',
    flex: 1,
    padding: '32px 24px',
    boxSizing: 'border-box',
    '@media (max-width: 420px)': {
      paddingInline: 16,
    },
  },
  main: {
    width: '100%',
    maxWidth: 416,
    margin: 'auto',
    padding: '32px 40px 24px',
    boxSizing: 'border-box',
    background: token.colorBgContainer,
    borderRadius: 12,
    boxShadow: '0 4px 8px rgba(9, 9, 11, 0.08)',
    '& input::placeholder': {
      color: token.colorTextTertiary,
      opacity: 1,
    },
    '@media (max-width: 760px)': {
      padding: '28px clamp(16px, 4vw, 24px)',
      borderRadius: 0,
      boxShadow: 'none',
    },
  },
  brand: {
    marginBottom: 24,
    textAlign: 'center',
    h1: {
      margin: '10px 0 4px',
      color: token.colorTextHeading,
      fontSize: 24,
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: 0,
    },
    p: {
      margin: 0,
      color: token.colorTextSecondary,
      fontSize: 13,
      lineHeight: 1.6,
    },
  },
  logo: {
    width: 44,
    height: 44,
    display: 'block',
    margin: '0 auto',
  },
  errorAlert: {
    marginBottom: 24,
  },
  agreement: {
    marginBottom: 4,
  },
  strength: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  strengthTrack: {
    appearance: 'none',
    width: '100%',
    maxWidth: 180,
    flex: 1,
    height: 4,
    borderRadius: 2,
    border: 'none',
    background: token.colorFillSecondary,
    '&::-webkit-meter-bar': {
      border: 'none',
      borderRadius: 2,
      background: 'transparent',
    },
    '&::-webkit-meter-optimum-value, &::-webkit-meter-suboptimum-value, &::-webkit-meter-even-less-good-value':
      {
        borderRadius: 2,
        background: 'var(--strength-color)',
      },
    '&::-moz-meter-bar': {
      borderRadius: 2,
      background: 'var(--strength-color)',
    },
  },
  strengthText: {
    flexShrink: 0,
    fontSize: 12,
    lineHeight: 1.5,
  },
  submit: {
    height: 44,
    marginTop: 12,
    fontSize: 16,
    fontWeight: 500,
    '&.ant-btn-primary': {
      backgroundColor: '#2b2d2f',
      borderColor: '#2b2d2f',
      color: '#fff',
      boxShadow: '0 1px 2px rgba(9, 9, 11, 0.2)',
      '&:hover': {
        backgroundColor: '#1d1f21',
        borderColor: '#1d1f21',
        color: '#fff',
      },
      '&:active': {
        backgroundColor: '#121315',
        borderColor: '#121315',
        color: '#fff',
      },
      '&:focus-visible': {
        outline: '2px solid #2b2d2f',
        outlineOffset: 2,
      },
      '&:disabled': {
        backgroundColor: '#43454a',
        borderColor: '#43454a',
        color: 'rgba(255, 255, 255, 0.65)',
      },
    },
  },
  login: {
    marginTop: 16,
    textAlign: 'center',
    color: token.colorTextSecondary,
    fontSize: 14,
    a: {
      color: token.colorTextSecondary,
      textDecoration: 'none',
      transition: 'color 0.2s ease',
      '&:hover': {
        color: token.colorText,
        textDecoration: 'underline',
        textUnderlineOffset: 3,
      },
    },
  },
}));

export default useStyles;
