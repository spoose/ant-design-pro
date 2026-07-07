import { request } from '@umijs/max';
import type { CurrentLoginEntryResult, LoginEntryListResult } from './data';

export async function queryLoginEntries() {
  return request<LoginEntryListResult>('/api/loginEntries', {
    method: 'GET',
  });
}

export async function selectLoginEntry(entryId: string) {
  return request<CurrentLoginEntryResult>('/api/currentLoginEntry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: {
      entryId,
    },
  });
}
