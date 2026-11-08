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

// 직전 브리핑이 오래돼도(첫 실행 등) 검색 창이 직전 개장일 00:00 KST보다 길어지지 않게 하는 하한이다.
const getPreviousTradingDayStart = (now: string, holidays: Holidays) => {
  let day = toKst(now).startOf('day').subtract(1, 'day');
  while (!getTradingDay(day.format('YYYY-MM-DD'), holidays).tradingDay) {
    day = day.subtract(1, 'day');
  }
  return day;
};

export const getSince = (
  previousGeneratedAt: string | null,
  now: string,
  holidays: Holidays,
): string => {
  const since = previousGeneratedAt ?? toKst(now).subtract(SINCE_FALLBACK_HOURS, 'hour').format();
  const lowerBound = getPreviousTradingDayStart(now, holidays);
  return dayjs(since).isBefore(lowerBound) ? lowerBound.format() : since;
};
