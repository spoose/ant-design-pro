export type LoginEntry = {
  id: string;
  name: string;
  type: 'department' | 'system';
  systemName: string;
  code?: string;
  entryUrl?: string;
};

export type LoginEntryListResult = {
  success?: boolean;
  data?: LoginEntry[];
  errorMessage?: string;
};

export type CurrentLoginEntryResult = {
  success?: boolean;
  data?: LoginEntry;
  errorMessage?: string;
};
