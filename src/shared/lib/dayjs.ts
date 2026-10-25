import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

// KST는 UTC+9 고정(서머타임 없음)이라 timezone 플러그인 없이 오프셋으로 다룬다.
export const KST_OFFSET_MINUTES = 540;

export const nowKst = (): Dayjs => dayjs().utcOffset(KST_OFFSET_MINUTES);

export const toKst = (iso: string): Dayjs => dayjs(iso).utcOffset(KST_OFFSET_MINUTES);

export { dayjs };
