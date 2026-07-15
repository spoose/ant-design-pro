import { beforeEach, describe, expect, it } from 'vitest';
import type { AccessContext } from '@/services/auth';
import {
  clearCurrentContextId,
  getCurrentContextId,
  resolveCurrentContextId,
  setCurrentContextId,
} from './currentContext';

const contexts: AccessContext[] = [
  {
    id: 'context-1',
    systemId: 'system-1',
    systemCode: 'SYS1',
    systemName: 'System 1',
    scopeType: 'system',
    permissions: ['page:home'],
    skillCodes: [],
  },
  {
    id: 'context-2',
    systemId: 'system-2',
    systemCode: 'SYS2',
    systemName: 'System 2',
    scopeType: 'system',
    permissions: ['page:home'],
    skillCodes: [],
  },
];

describe('currentContext', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('stores only the current context id for the active tab', () => {
    setCurrentContextId('context-1');

    expect(getCurrentContextId()).toBe('context-1');
  });

  it('clears the stored context id', () => {
    setCurrentContextId('context-1');

    clearCurrentContextId();

    expect(getCurrentContextId()).toBeUndefined();
  });

  it('prefers a valid current-tab context over the default context', () => {
    setCurrentContextId('context-2');

    expect(resolveCurrentContextId(contexts, 'context-1')).toBe('context-2');
  });

  it('uses the default context when the stored context is invalid', () => {
    setCurrentContextId('missing-context');

    expect(resolveCurrentContextId(contexts, 'context-1')).toBe('context-1');
    expect(getCurrentContextId()).toBeUndefined();
  });

  it('returns undefined when neither context is valid', () => {
    expect(
      resolveCurrentContextId(contexts, 'missing-context'),
    ).toBeUndefined();
  });
});
