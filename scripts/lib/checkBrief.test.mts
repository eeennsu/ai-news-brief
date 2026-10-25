import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Brief, NewsItem, Stock } from '../../src/entities/brief/types.ts';
import { checkBrief } from './checkBrief.mts';
import type { Watchlist } from './schemas.mts';

const watchlist: Watchlist = {
  holdings: [{ market: 'US', ticker: 'NVDA', name: '엔비디아' }],
  interests: [{ market: 'KR', ticker: '000660', name: 'SK하이닉스' }],
};
const stock = (o: Partial<Stock> = {}): Stock => ({
  market: 'US',
  ticker: 'AMD',
  name: 'AMD',
  verdict: 'neutral',
  strength: 'weak',
  reason: '근거',
  watch: null,
  ...o,
});
const item = (o: Partial<NewsItem> = {}): NewsItem => ({
  title: '제목',
  summary: '요약',
  url: 'https://example.com/a',
  source: 'Reuters',
  publishedAt: '2026-10-26T06:00:00+09:00',
  stocks: [stock()],
  ...o,
});
const brief = (items: NewsItem[]): Brief => ({
  date: '2026-10-26',
  generatedAt: '2026-10-26T07:37:00+09:00',
  items,
});
const previous: Brief = {
  date: '2026-10-23',
  generatedAt: '2026-10-23T07:40:00+09:00',
  items: [item({ url: 'https://example.com/old', publishedAt: '2026-10-23T06:00:00+09:00' })],
};
const ctx = { previous, watchlist, now: '2026-10-26T07:50:00+09:00' };
const holding = stock({ ticker: 'NVDA', name: '엔비디아', watch: 'holding' });

test('규칙에 맞으면 오류가 없다', () => assert.deepEqual(checkBrief(brief([item()]), ctx), []));
test('빈 브리핑은 통과한다', () => assert.deepEqual(checkBrief(brief([]), ctx), []));
test('직전 생성 시각 이전 기사를 잡는다', () => {
  const errors = checkBrief(brief([item({ publishedAt: '2026-10-23T07:00:00+09:00' })]), ctx);
  assert.equal(errors.length, 1);
  assert.match(errors[0] ?? '', /^items\[0\]\.publishedAt: /);
});
test('직전이 없으면 24시간보다 오래된 기사를 잡는다', () =>
  assert.equal(
    checkBrief(brief([item({ publishedAt: '2026-10-25T07:00:00+09:00' })]), {
      ...ctx,
      previous: null,
    }).length,
    1,
  ));
test('미래 발행 시각을 잡는다', () =>
  assert.match(
    checkBrief(brief([item({ publishedAt: '2026-10-26T08:00:00+09:00' })]), ctx)[0] ?? '',
    /^items\[0\]\.publishedAt: /,
  ));
test('직전 브리핑에 실린 URL을 잡는다', () =>
  assert.match(
    checkBrief(brief([item({ url: 'https://example.com/old' })]), ctx)[0] ?? '',
    /^items\[0\]\.url: /,
  ));
test('브리핑 안의 중복 URL을 잡는다', () =>
  assert.match(checkBrief(brief([item(), item()]), ctx)[0] ?? '', /^items\[1\]\.url: /));
test('보유 종목인데 watch가 null이면 잡는다', () =>
  assert.match(
    checkBrief(brief([item({ stocks: [stock({ ticker: 'NVDA', name: '엔비디아' })] })]), ctx)[0] ??
      '',
    /^items\[0\]\.stocks\[0\]\.watch: /,
  ));
test('관심 종목을 holding으로 적으면 잡는다', () =>
  assert.equal(
    checkBrief(
      brief([
        item({
          stocks: [stock({ market: 'KR', ticker: '000660', name: 'SK하이닉스', watch: 'holding' })],
        }),
      ]),
      ctx,
    ).length,
    1,
  ));
test('보유 종목 뉴스가 비보유 뉴스 뒤에 오면 잡는다', () =>
  assert.match(
    checkBrief(
      brief([item(), item({ url: 'https://example.com/b', stocks: [holding] })]),
      ctx,
    )[0] ?? '',
    /^items\[1\]: /,
  ));
test('보유 종목 뉴스가 앞이면 통과한다', () =>
  assert.deepEqual(
    checkBrief(brief([item({ url: 'https://example.com/b', stocks: [holding] }), item()]), ctx),
    [],
  ));
