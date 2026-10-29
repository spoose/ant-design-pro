import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('XOne startup config', () => {
  it('allows an empty public origin for a same-origin gateway', () => {
    const output = execFileSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '--eval',
        `const config = require('./config/config.ts').default;
console.log(JSON.stringify({
  target: config.proxy['/web/'].target,
  publicOrigin: config.define['process.env.XONE_PUBLIC_BASE_URL'],
  backend: config.define['process.env.AUTH_BACKEND'],
}));`,
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          UMI_ENV: 'xone',
          AUTH_BACKEND: 'xone',
          XONE_API_TARGET: 'http://xone.test:18086',
          XONE_PUBLIC_BASE_URL: '',
          COMMIT_HASH: 'test-commit',
        },
      },
    );
    expect(JSON.parse(output)).toEqual({
      target: 'http://xone.test:18086',
      publicOrigin: '',
      backend: 'xone',
    });
  });
});
