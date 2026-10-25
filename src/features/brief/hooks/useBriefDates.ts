import { skipToken, useQuery } from '@tanstack/react-query';

import { qk } from '@shared/api/queryKeys';

import { fetchBriefDates } from '../apis/github';

// SHA로 고정한 목록은 바뀌지 않으므로 캐시를 영구 보관한다.
export const useBriefDates = (sha: string | undefined) =>
  useQuery({
    queryKey: qk.brief.dates(sha ?? ''),
    queryFn: sha ? () => fetchBriefDates(sha) : skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });
