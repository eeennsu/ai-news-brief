import assert from 'node:assert/strict';
import { test } from 'node:test';

import { briefSchema } from '../../src/entities/brief/contracts.ts';

const stock = {
  market: 'KR',
  ticker: '000660',
  name: 'SK하이닉스',
  verdict: 'positive',
  strength: 'strong',
  reason: 'HBM 수요',
  watch: null,
};
const item = {
  title: 't',
  summary: 's',
  source: 'Reuters',
  url: 'https://example.com/a',
  publishedAt: '2026-10-26T06:00:00+09:00',
  stocks: [stock],
};
const brief = (items: unknown[]) => ({
  date: '2026-10-26',
  generatedAt: '2026-10-26T07:37:00+09:00',
  items,
});

test('맞는 브리핑은 통과한다', () =>
  assert.equal(briefSchema.safeParse(brief([item])).success, true));
test('빈 브리핑도 통과한다', () => assert.equal(briefSchema.safeParse(brief([])).success, true));
test('11건이면 거른다', () =>
  assert.equal(briefSchema.safeParse(brief(Array(11).fill(item))).success, false));
test('종목이 없는 뉴스는 거른다', () =>
  assert.equal(briefSchema.safeParse(brief([{ ...item, stocks: [] }])).success, false));
test('KR 코드에 접미사가 붙으면 거른다', () =>
  assert.equal(
    briefSchema.safeParse(brief([{ ...item, stocks: [{ ...stock, ticker: '000660.KS' }] }]))
      .success,
    false,
  ));
test('US 코드가 소문자면 거른다', () =>
  assert.equal(
    briefSchema.safeParse(
      brief([{ ...item, stocks: [{ ...stock, market: 'US', ticker: 'nvda' }] }]),
    ).success,
    false,
  ));
test('http 링크는 거른다', () =>
  assert.equal(
    briefSchema.safeParse(brief([{ ...item, url: 'http://example.com/a' }])).success,
    false,
  ));
test('시간대 없는 발행 시각은 거른다', () =>
  assert.equal(
    briefSchema.safeParse(brief([{ ...item, publishedAt: '2026-10-26T06:00:00' }])).success,
    false,
  ));
