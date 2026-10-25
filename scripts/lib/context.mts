import { dayjs, toKst } from '../../src/shared/lib/dayjs.ts';
import type { Holidays } from './schemas.mts';

const SATURDAY = 6;
const SUNDAY = 0;
const SINCE_FALLBACK_HOURS = 24;
const BRIEF_FILE = /^(\d{4}-\d{2}-\d{2})\.json$/;

type TradingDay = { tradingDay: true } | { tradingDay: false; reason: 'weekend' | 'holiday' };

export const getTradingDay = (date: string, holidays: Holidays): TradingDay => {
  const day = dayjs.utc(date).day();
  if (day === SATURDAY || day === SUNDAY) return { tradingDay: false, reason: 'weekend' };

  const year = Number(date.slice(0, 4));
  if (!holidays.years.includes(year)) {
    throw new Error(`휴장일 목록이 ${year}년을 덮지 않는다. data/krx-holidays.json을 갱신한다`);
  }
  return holidays.dates.includes(date)
    ? { tradingDay: false, reason: 'holiday' }
    : { tradingDay: true };
};

// 같은 날 재실행이면 오늘 파일은 직전이 아니다(엄격히 이전 날짜만).
export const findPreviousDate = (names: string[], date: string): string | null =>
  names
    .map((name) => BRIEF_FILE.exec(name)?.[1])
    .filter((name): name is string => name !== undefined && name < date)
    .sort()
    .at(-1) ?? null;

export const getSince = (previousGeneratedAt: string | null, now: string): string =>
  previousGeneratedAt ?? toKst(now).subtract(SINCE_FALLBACK_HOURS, 'hour').format();
