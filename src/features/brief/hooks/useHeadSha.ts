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
    // 복귀 때 fresh여도 다시 읽는다. 재조회가 TodayScreen을 리렌더해 오늘 날짜도 다시 계산된다.
    refetchOnWindowFocus: 'always',
  });
  return { sha: hint ?? query.data, query };
};
