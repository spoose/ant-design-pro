import { createStyles } from 'antd-style';

const GRAPHITE = '#2b2d2f';

const useStyles = createStyles(({ token }) => ({
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  option: {
    display: 'flex',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    minHeight: 60,
    marginInlineEnd: 0,
    padding: '12px 16px',
    boxSizing: 'border-box',
    border: `1px solid ${token.colorBorder}`,
    borderRadius: 8,
    background: token.colorBgContainer,
    cursor: 'pointer',
    transition: 'border-color 0.2s ease, background-color 0.2s ease',
    '& .ant-radio': {
      flexShrink: 0,
    },
    '& .ant-radio-label': {
      display: 'flex',
      flex: 1,
      minWidth: 0,
    },
    '& .ant-radio-inner': {
      borderColor: token.colorBorderSecondary,
      transition: 'border-color 0.2s ease, background-color 0.2s ease',
    },
    '& .ant-radio-input:focus-visible + .ant-radio-inner': {
      outline: `2px solid ${GRAPHITE}`,
      outlineOffset: 1,
    },
    '&:hover': {
      borderColor: '#9a9b9d',
      '& .ant-radio-inner': {
        borderColor: '#9a9b9d',
      },
    },
    '&.ant-radio-wrapper-checked': {
      borderColor: GRAPHITE,
      background: 'rgba(43, 45, 47, 0.045)',
      '& .ant-radio-inner': {
        borderColor: GRAPHITE,
        backgroundColor: GRAPHITE,
      },
      '& .ant-radio-inner::after': {
        backgroundColor: '#fff',
      },
    },
  },
  optionBody: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  iconChip: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: 8,
    background: token.colorFillSecondary,
    color: GRAPHITE,
    fontSize: 16,
  },
  optionText: {
    minWidth: 0,
  },
  optionName: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: token.colorText,
    fontSize: 15,
    fontWeight: 500,
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  defaultTag: {
    marginInlineEnd: 0,
    padding: '0 6px',
    color: token.colorTextSecondary,
    fontSize: 12,
    lineHeight: '20px',
    background: token.colorFillSecondary,
    border: 'none',
    borderRadius: 4,
  },
  optionMeta: {
    marginTop: 2,
    color: token.colorTextSecondary,
    fontSize: 12,
    lineHeight: 1.5,
    fontFamily: token.fontFamilyCode,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}));

export default useStyles;
