import { StyleSheet, Text, View } from 'react-native';

import type { Brief } from '@entities/brief';

import { COPY } from '@shared/config/copy';
import { toKst } from '@shared/lib/dayjs';
import { colors, space } from '@shared/ui/theme';

import { NewsCard } from './NewsCard';

type Props = { brief: Brief };

export const BriefView = ({ brief }: Props) => (
  <View style={styles.root}>
    <Text style={styles.generated}>
      {COPY.brief.generatedAt(toKst(brief.generatedAt).format('MM/DD HH:mm'))}
    </Text>
    {brief.items.length === 0 ? (
      <Text style={styles.empty}>{COPY.brief.noNews}</Text>
    ) : (
      brief.items.map((item) => <NewsCard key={item.url} item={item} />)
    )}
  </View>
);

const styles = StyleSheet.create({
  root: { gap: space.md },
  generated: { fontSize: 13, lineHeight: 18, color: colors.textSub },
  empty: {
    paddingVertical: space.xl,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    textAlign: 'center',
  },
});
