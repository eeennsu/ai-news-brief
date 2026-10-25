import { useQuery } from '@tanstack/react-query';

import { qk } from '@shared/api/queryKeys';

import { fetchHeadSha } from '../apis/github';

const HEAD_STALE_MS = 30_000;
const HEAD_GC_MS = 300_000;

// hint(알림이 준 SHA 등)가 있으면 요청하지 않고 그 값을 쓴다.
export const useHeadSha = (hint?: string) => {
  const query = useQuery({
    queryKey: qk.brief.head(),
    queryFn: fetchHeadSha,
    staleTime: HEAD_STALE_MS,
    gcTime: HEAD_GC_MS,
    enabled: !hint,
  });
  return { sha: hint ?? query.data, query };
};
