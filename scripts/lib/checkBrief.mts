import { WATCH } from '../../src/entities/brief/contracts.ts';
import type { Brief, Stock } from '../../src/entities/brief/types.ts';
import { dayjs } from '../../src/shared/lib/dayjs.ts';
import { getSince } from './context.mts';
import type { Watchlist } from './schemas.mts';

type CheckContext = { previous: Brief | null; watchlist: Watchlist; now: string };

const isSameStock = (a: Stock, b: { market: string; ticker: string }) =>
  a.market === b.market && a.ticker === b.ticker;

// 보유와 관심에 모두 있으면 보유가 이긴다.
const expectedWatch = (stock: Stock, watchlist: Watchlist): Stock['watch'] => {
  if (watchlist.holdings.some((ref) => isSameStock(stock, ref))) return WATCH.holding;
  if (watchlist.interests.some((ref) => isSameStock(stock, ref))) return WATCH.interest;
  return null;
};

export const checkBrief = (brief: Brief, ctx: CheckContext): string[] => {
  const errors: string[] = [];
  const since = getSince(ctx.previous?.generatedAt ?? null, brief.generatedAt);
  const previousUrls = new Set(ctx.previous?.items.map((item) => item.url));
  const seenUrls = new Set<string>();
  let seenNonHolding = false;

  if (dayjs(brief.generatedAt).isAfter(ctx.now)) {
    errors.push(`generatedAt: 현재 시각(${ctx.now})보다 미래다`);
  }

  brief.items.forEach((item, i) => {
    const at = `items[${i}]`;

    if (dayjs(item.publishedAt).isBefore(since)) {
      const basis = ctx.previous ? '직전 브리핑 생성 시각' : '생성 시각 24시간 전';
      errors.push(`${at}.publishedAt: ${basis}(${since}) 이전 기사다`);
    }
    if (dayjs(item.publishedAt).isAfter(ctx.now)) {
      errors.push(`${at}.publishedAt: 현재 시각(${ctx.now})보다 미래다`);
    }

    if (previousUrls.has(item.url)) {
      errors.push(`${at}.url: 직전 브리핑(${ctx.previous?.date})에 이미 실린 URL이다`);
    } else if (seenUrls.has(item.url)) {
      errors.push(`${at}.url: 브리핑 안에서 중복된 URL이다`);
    }
    seenUrls.add(item.url);

    item.stocks.forEach((stock, j) => {
      const expected = expectedWatch(stock, ctx.watchlist);
      if (stock.watch !== expected) {
        errors.push(
          `${at}.stocks[${j}].watch: ${stock.market} ${stock.ticker}의 watch가 watchlist와 다르다 (기대: ${String(expected)}, 실제: ${String(stock.watch)})`,
        );
      }
    });

    const hasHolding = item.stocks.some((stock) => stock.watch === WATCH.holding);
    if (hasHolding && seenNonHolding) {
      errors.push(`${at}: 보유 종목 뉴스는 보유 종목이 아닌 뉴스보다 앞에 와야 한다`);
    }
    if (!hasHolding) seenNonHolding = true;
  });

  return errors;
};
