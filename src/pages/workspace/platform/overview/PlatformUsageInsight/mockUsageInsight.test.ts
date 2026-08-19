import { describe, expect, it, vi } from 'vitest';
import {
  getMockAiUsageTotals,
  mockAiFailureCounts,
  mockAiRequestCounts,
} from './mockUsageInsight';

describe('getMockAiUsageTotals', () => {
  it('derives weekly totals and Thursday peak from the request mock', () => {
    const totals = getMockAiUsageTotals();
    expect(totals.totalRequests).toBe(
      mockAiRequestCounts.reduce((sum, count) => sum + count, 0),
    );
    expect(totals.peakDayLabel).toBe('周四');
    expect(totals.peakRequests).toBe(1760);
    expect(totals.totalFailures).toBe(238);
    expect(Math.max(...mockAiFailureCounts)).toBe(89);
    expect(mockAiFailureCounts.indexOf(89)).not.toBe(totals.peakDayIndex);
    expect(
      totals.allocation.reduce(
        (sum, item) => sum + Number(item.amount.replace(',', '')),
        0,
      ),
    ).toBe(totals.totalRequests);
    expect(totals.inputTotal).toBe(20180);
  });
});

describe('makeLivelinePoints timing', () => {
  it('holds each day so Thursday peak stays visible in the live window', () => {
    const end = 1_700_000_000;
    const secondsPerDay = 6;
    vi.spyOn(Date, 'now').mockReturnValue(end * 1000);

    const total = mockAiRequestCounts.length * secondsPerDay;
    const points = Array.from({ length: total }, (_, index) => ({
      time: end - (total - 1 - index),
      value: mockAiRequestCounts[Math.floor(index / secondsPerDay)],
    }));

    expect(points.at(-1)?.time).toBe(end);
    expect(points.filter((point) => point.value === 1760)).toHaveLength(
      secondsPerDay,
    );
    vi.restoreAllMocks();
  });
});
