import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Brief, NewsItem, Stock } from '../../src/entities/brief/types.ts';
import { buildPushMessage, isPastCutoff, sendPush } from './push.mts';

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
const item = (title: string, stocks: Stock[] = [stock()]): NewsItem => ({
  title,
  summary: '요약',
  url: `https://example.com/${title}`,
  source: 'Reuters',
  publishedAt: '2026-10-26T06:00:00+09:00',
  stocks,
});
const brief = (items: NewsItem[]): Brief => ({
  date: '2026-10-26',
  generatedAt: '2026-10-26T07:37:00+09:00',
  items,
});
const TOKEN = 'ExponentPushToken[x]';

test('Top 2를 한 줄씩 넣고 보유 종목을 앞에 표시한다', () => {
  const holdings = [
    stock({ ticker: 'NVDA', name: '엔비디아', watch: 'holding' }),
    stock({ market: 'KR', ticker: '000660', name: 'SK하이닉스', watch: 'holding' }),
  ];
  assert.deepEqual(
    buildPushMessage(
      brief([item('HBM 공급 확대', holdings), item('B'), item('C')]),
      TOKEN,
      'abc123',
    ),
    {
      to: TOKEN,
      title: 'AI 브리핑 10/26 · 3건',
      body: '1. [보유 엔비디아·SK하이닉스] HBM 공급 확대\n2. B',
      data: { date: '2026-10-26', sha: 'abc123' },
      channelId: 'default',
      priority: 'high',
      sound: 'default',
    },
  );
});
test('1건이면 한 줄만 넣는다', () =>
  assert.equal(buildPushMessage(brief([item('A')]), TOKEN, 's').body, '1. A'));
test('0건이면 없음 문구를 보낸다', () => {
  const msg = buildPushMessage(brief([]), TOKEN, 's');
  assert.equal(msg.title, 'AI 브리핑 10/26');
  assert.equal(msg.body, '오늘은 기준에 맞는 새 뉴스가 없다');
});
test('9시 KST부터 컷오프다', () => {
  assert.equal(isPastCutoff('2026-10-26T08:59:59+09:00'), false);
  assert.equal(isPastCutoff('2026-10-26T09:00:00+09:00'), true);
  assert.equal(isPastCutoff('2026-10-25T23:59:00Z'), false);
  assert.equal(isPastCutoff('2026-10-26T00:00:00Z'), true);
});
const msg = buildPushMessage(brief([item('A')]), TOKEN, 's');
const reply =
  (body: unknown, status = 200) =>
  () =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));
test('ok ticket이면 id를 돌려준다', async () =>
  assert.equal(
    await sendPush(msg, reply({ data: [{ status: 'ok', id: 'ticket-1' }] })),
    'ticket-1',
  ));
test('error ticket이면 throw한다', async () =>
  assert.rejects(
    sendPush(
      msg,
      reply({
        data: [
          { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
        ],
      }),
    ),
    /DeviceNotRegistered/,
  ));
test('HTTP 오류면 throw한다', async () =>
  assert.rejects(sendPush(msg, reply({ errors: [{ message: 'x' }] }, 500)), /500/));
test('2xx인데 응답 형식이 다르면 throw한다', async () =>
  assert.rejects(sendPush(msg, reply({ data: [] }))));
