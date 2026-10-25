import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { WATCH, type NewsItem, type Stock } from '@entities/brief';

import { COPY } from '@shared/config/copy';
import { toKst } from '@shared/lib/dayjs';
import { colors, MIN_TOUCH, radius, space } from '@shared/ui/theme';

const VERDICT_COLOR = {
  positive: colors.positive,
  negative: colors.negative,
  neutral: colors.neutral,
} as const;

const StockRow = ({ stock }: { stock: Stock }) => (
  <View
    style={[
      styles.stock,
      stock.watch === WATCH.holding && styles.holding,
      stock.watch === WATCH.interest && styles.interest,
    ]}
  >
    <View style={styles.stockHead}>
      <Text style={styles.stockName}>{`${stock.name}(${stock.ticker})`}</Text>
      {stock.watch ? (
        <Text
          style={[
            styles.badge,
            stock.watch === WATCH.holding ? styles.badgeHolding : styles.badgeInterest,
          ]}
        >
          {COPY.news.watch[stock.watch]}
        </Text>
      ) : null}
    </View>
    <Text style={[styles.verdict, { color: VERDICT_COLOR[stock.verdict] }]}>
      {`${COPY.news.verdict[stock.verdict]} · ${COPY.news.strength(COPY.news.strengthLabel[stock.strength])}`}
    </Text>
    <Text style={styles.reason}>{stock.reason}</Text>
  </View>
);

export const NewsCard = ({ item }: { item: NewsItem }) => (
  <View style={styles.card}>
    <Text style={styles.title}>{item.title}</Text>
    <Text
      style={styles.meta}
    >{`${item.source} · ${toKst(item.publishedAt).format('MM/DD HH:mm')}`}</Text>
    <Text style={styles.summary}>{item.summary}</Text>
    <View style={styles.stocks}>
      {item.stocks.map((stock) => (
        <StockRow key={`${stock.market}-${stock.ticker}`} stock={stock} />
      ))}
    </View>
    <Pressable
      onPress={() => void Linking.openURL(item.url)}
      accessibilityRole='link'
      hitSlop={space.sm}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text style={styles.linkLabel}>{COPY.news.openOriginal}</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  title: { fontSize: 17, lineHeight: 24, fontWeight: '600', color: colors.text },
  meta: { fontSize: 13, lineHeight: 18, color: colors.textSub },
  summary: { fontSize: 15, lineHeight: 23, color: colors.text },
  stocks: { gap: space.sm, marginTop: space.xs },
  stock: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  holding: { backgroundColor: colors.accentSoft },
  interest: { backgroundColor: colors.interestSoft },
  stockHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stockName: { flexShrink: 1, fontSize: 15, lineHeight: 20, fontWeight: '600', color: colors.text },
  badge: {
    overflow: 'hidden',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  badgeHolding: { backgroundColor: colors.accent, color: colors.onAccent },
  badgeInterest: { backgroundColor: colors.interestText, color: colors.onAccent },
  verdict: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  reason: { fontSize: 14, lineHeight: 20, color: colors.textSub },
  link: { alignSelf: 'flex-start', minHeight: MIN_TOUCH, justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  linkLabel: { fontSize: 15, fontWeight: '600', color: colors.accent },
});
