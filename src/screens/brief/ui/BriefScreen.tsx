import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { z } from 'zod';

import { BriefView } from '@widgets/briefView';

import { useBrief, useHeadSha } from '@features/brief';

import { COPY } from '@shared/config/copy';
import { SHA_PATTERN } from '@shared/config/repo';
import { ScreenScroll } from '@shared/ui/ScreenScroll';
import { StateView } from '@shared/ui/StateView';

const paramsSchema = z.object({
  date: z.iso.date(),
  sha: z.string().regex(SHA_PATTERN).optional(),
});

type ContentProps = { date: string; sha?: string };

const BriefContent = ({ date, sha: shaParam }: ContentProps) => {
  const router = useRouter();
  const { sha, query: head } = useHeadSha(shaParam);
  const brief = useBrief(sha, date);

  const retry = () => void (sha ? brief.refetch() : head.refetch());

  if (brief.data) return <BriefView brief={brief.data} />;
  if (brief.data === null) {
    return (
      <StateView
        kind='empty'
        title={COPY.brief.missingTitle}
        message={COPY.brief.missingMessage}
        actionLabel={COPY.brief.archiveAction}
        onAction={() => router.replace('/archive')}
      />
    );
  }
  if (head.isError || brief.isError) {
    return (
      <StateView
        kind='error'
        title={COPY.error.title}
        message={COPY.error.message}
        actionLabel={COPY.error.retryAction}
        onAction={retry}
      />
    );
  }
  return <StateView kind='loading' skeleton='cards' />;
};

export const BriefScreen = () => {
  const router = useRouter();
  const params = paramsSchema.safeParse(useLocalSearchParams());

  return (
    <ScreenScroll>
      <Stack.Screen options={{ title: params.success ? params.data.date : '' }} />
      {params.success ? (
        <BriefContent date={params.data.date} sha={params.data.sha} />
      ) : (
        <StateView
          kind='error'
          title={COPY.brief.invalidTitle}
          message={COPY.brief.invalidMessage}
          actionLabel={COPY.brief.archiveAction}
          onAction={() => router.replace('/archive')}
        />
      )}
    </ScreenScroll>
  );
};
