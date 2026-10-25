import { skipToken, useQuery } from '@tanstack/react-query';

import { qk } from '@shared/api/queryKeys';

import { fetchBrief } from '../apis/github';

// SHA로 고정한 파일은 바뀌지 않으므로 캐시를 영구 보관한다. 파일이 없으면 data가 null이다.
export const useBrief = (sha: string | undefined, date: string) =>
  useQuery({
    queryKey: qk.brief.detail(sha ?? '', date),
    queryFn: sha ? () => fetchBrief(sha, date) : skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });
