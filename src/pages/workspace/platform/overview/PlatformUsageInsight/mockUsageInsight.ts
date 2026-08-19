/** 近 7 日 mock 请求次数：工作日高、周末回落，周四为峰值。 */
export const mockAiRequestCounts = [
  1280, 1520, 980, 1760, 1430, 620, 540,
] as const;

/** 失败不全随请求走：周三异常偏高，其余约 2%。 */
export const mockAiFailureCounts = [22, 28, 89, 41, 33, 14, 11] as const;

/**
 * 输入 Token（千）。按约 2.5k Token/请求从请求量换算后取整。
 * 与请求次数不同量级，避免对比图两条线贴在一起。
 */
export const mockAiInputTokens = [
  3180, 3770, 2430, 4370, 3550, 1540, 1340,
] as const;

/** 输出 Token（千），约为输入的 35%。 */
export const mockAiOutputTokens = [
  1110, 1320, 850, 1530, 1240, 540, 470,
] as const;

export const mockAiDayLabels = [
  '周一',
  '周二',
  '周三',
  '周四',
  '周五',
  '周六',
  '周日',
] as const;

const sum = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0);

export const getMockAiUsageTotals = () => {
  const totalRequests = sum(mockAiRequestCounts);
  const totalFailures = sum(mockAiFailureCounts);
  const inputTotal = sum(mockAiInputTokens);
  const outputTotal = sum(mockAiOutputTokens);
  let peakDayIndex = 0;
  let peakRequests: number = mockAiRequestCounts[0];

  for (let index = 1; index < mockAiRequestCounts.length; index += 1) {
    const count = mockAiRequestCounts[index];
    if (count > peakRequests) {
      peakRequests = count;
      peakDayIndex = index;
    }
  }

  const avgRequests = Math.round(totalRequests / mockAiRequestCounts.length);
  const spikeDelta = peakRequests - avgRequests;
  const xoneaiRequests = Math.round(totalRequests * 0.725);
  const fileReviewRequests = Math.round(totalRequests * 0.228);
  const otherRequests = totalRequests - xoneaiRequests - fileReviewRequests;

  return {
    totalRequests,
    totalFailures,
    peakDayIndex,
    peakDayLabel: mockAiDayLabels[peakDayIndex],
    peakRequests,
    avgRequests,
    spikeDelta,
    /** 相对上周，不从本周折线反推。 */
    inputDelta: '+12%',
    outputDelta: '-4%',
    inputTotal,
    outputTotal,
    spikeLabel: `+${spikeDelta.toLocaleString('en-US')}`,
    xoneaiShare: '72.5%',
    allocation: [
      {
        id: 'xoneai',
        label: 'xOneAI',
        short: 'AI',
        pct: 72.5,
        amount: xoneaiRequests.toLocaleString('en-US'),
        barClass: 'bg-[#975FE4]',
        toneClass: 'text-[#6b4bb3]',
      },
      {
        id: 'file-review',
        label: '文件审查',
        short: '审',
        pct: 22.8,
        amount: fileReviewRequests.toLocaleString('en-US'),
        barClass: 'bg-[#54915c]',
        toneClass: 'text-[#54915c]',
      },
      {
        id: 'other',
        label: '其他应用',
        short: '其',
        pct: 4.7,
        amount: otherRequests.toLocaleString('en-US'),
        barClass: 'bg-zinc-300 dark:bg-zinc-600',
        toneClass: 'text-zinc-500',
      },
    ] as const,
  };
};

export const mockAiUsageAllocation = getMockAiUsageTotals().allocation;
