import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findPreviousDate, getSince, getTradingDay } from './context.mts';

const holidays = {
  source: 'https://open.krx.co.kr',
  checkedAt: '2026-10-25',
  years: [2026],
  dates: ['2026-12-25'],
};

test('평일이고 휴장일이 아니면 개장일이다', () =>
  assert.deepEqual(getTradingDay('2026-10-26', holidays), { tradingDay: true }));
test('주말은 개장일이 아니다', () =>
  assert.deepEqual(getTradingDay('2026-10-25', holidays), {
    tradingDay: false,
    reason: 'weekend',
  }));
test('휴장일 목록에 있으면 개장일이 아니다', () =>
  assert.deepEqual(getTradingDay('2026-12-25', holidays), {
    tradingDay: false,
    reason: 'holiday',
  }));
test('목록이 그해를 덮지 않으면 평일에 throw한다', () =>
  assert.throws(() => getTradingDay('2027-01-04', holidays), /2027/));
test('직전 브리핑은 오늘보다 앞선 가장 늦은 날짜다', () =>
  assert.equal(
    findPreviousDate(
      ['2026-10-22.json', '2026-10-26.json', '2026-10-23.json', '.gitkeep'],
      '2026-10-26',
    ),
    '2026-10-23',
  ));
test('직전 브리핑이 없으면 null이다', () =>
  assert.equal(findPreviousDate(['2026-10-26.json'], '2026-10-26'), null));
test('since는 직전 생성 시각이다', () =>
  assert.equal(
    getSince('2026-10-23T07:40:00+09:00', '2026-10-26T07:37:00+09:00'),
    '2026-10-23T07:40:00+09:00',
  ));
test('직전이 없으면 since는 24시간 전이다', () =>
  assert.equal(getSince(null, '2026-10-26T07:37:00+09:00'), '2026-10-25T07:37:00+09:00'));
