import { describe, expect, it } from 'vitest';
import { createXoneProxy } from '../../config/proxy';

describe('XOne development proxy', () => {
  it('requires an explicit upstream target in real-backend mode', () => {
    expect(() => createXoneProxy()).toThrow(
      '实连 XOne 必须设置 XONE_API_TARGET',
    );
  });

  it('routes /web requests without exposing the upstream in browser code', () => {
    expect(createXoneProxy('http://xone.example.test')).toEqual({
      '/api/': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
      '/web/': {
        target: 'http://xone.example.test',
        changeOrigin: true,
      },
    });
  });
});
