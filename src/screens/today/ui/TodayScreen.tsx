import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { BriefView } from '@widgets/briefView';

import { useBrief, useBriefDates, useHeadSha } from '@features/brief';

import { COPY } from '@shared/config/copy';
import { nowKst } from '@shared/lib/dayjs';
import { ScreenScroll } from '@shared/ui/ScreenScroll';
import { StateView } from '@shared/ui/StateView';
import { colors, MIN_TOUCH } from '@shared/ui/theme';

const ArchiveLink = () => (
  <Link href='/archive' style={styles.archiveLink} accessibilityRole='link'>
    <Text style={styles.archiveLabel}>{COPY.today.archiveLink}</Text>
  </Link>
);

export const TodayScreen = () => {
  const router = useRouter();
  const date = nowKst().format('YYYY-MM-DD');
  const { sha, query: head } = useHeadSha();
  const brief = useBrief(sha, date);
  // 오늘 파일이 없을 때만 목록을 읽어 가장 최근 날짜를 찾는다.
  const dates = useBriefDates(brief.data === null ? sha : undefined);
  const latest = dates.data?.[0];

  const retry = () => void (sha ? brief.refetch() : head.refetch());
  const openLatest = () => {
    if (sha && latest) router.push({ pathname: '/brief/[date]', params: { date: latest, sha } });
  };

  const renderBody = () => {
    if (brief.data) return <BriefView brief={brief.data} />;
    if (brief.data === null) {
      return (
        <StateView
          kind='empty'
          title={COPY.today.emptyTitle}
          message={COPY.today.emptyMessage}
          actionLabel={latest ? COPY.today.latestAction : undefined}
          onAction={openLatest}
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

  return (
    <>
      <Stack.Screen options={{ headerRight: ArchiveLink }} />
      <ScreenScroll onRefresh={() => void head.refetch()} refreshing={head.isRefetching}>
        {renderBody()}
      </ScreenScroll>
    </>
  );
};

const styles = StyleSheet.create({
  archiveLink: { minHeight: MIN_TOUCH, textAlignVertical: 'center' },
  archiveLabel: { fontSize: 15, fontWeight: '600', color: colors.accent },
});
