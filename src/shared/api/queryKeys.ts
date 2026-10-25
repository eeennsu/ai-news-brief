export const qk = {
  brief: {
    head: () => ['brief', 'head'] as const,
    dates: (sha: string) => ['brief', 'dates', sha] as const,
    detail: (sha: string, date: string) => ['brief', 'detail', sha, date] as const,
  },
};
