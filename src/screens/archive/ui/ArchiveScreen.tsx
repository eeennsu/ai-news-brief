import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useBriefDates, useHeadSha } from '@features/brief';

import { COPY } from '@shared/config/copy';
import { ScreenScroll } from '@shared/ui/ScreenScroll';
import { StateView } from '@shared/ui/StateView';
import { colors, MIN_TOUCH, radius, space } from '@shared/ui/theme';

export const ArchiveScreen = () => {
  const router = useRouter();
  const { sha, query: head } = useHeadSha();
  const dates = useBriefDates(sha);

  const retry = () => void (sha ? dates.refetch() : head.refetch());

  const renderBody = () => {
    if (dates.data && sha) {
      if (dates.data.length === 0) {
        return (
          <StateView
            kind='empty'
            title={COPY.archive.emptyTitle}
            message={COPY.archive.emptyMessage}
          />
        );
      }
      return dates.data.map((date) => (
        <Pressable
          key={date}
          accessibilityRole='button'
          onPress={() => router.push({ pathname: '/brief/[date]', params: { date, sha } })}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text style={styles.date}>{date}</Text>
        </Pressable>
      ));
    }
    if (head.isError || dates.isError) {
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
    return <StateView kind='loading' skeleton='rows' />;
  };

  return (
    <ScreenScroll onRefresh={() => void head.refetch()} refreshing={head.isRefetching}>
      {renderBody()}
    </ScreenScroll>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH + space.sm,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  pressed: { opacity: 0.7 },
  date: { fontSize: 16, fontWeight: '500', color: colors.text },
});
