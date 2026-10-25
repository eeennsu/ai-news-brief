import { z } from 'zod';

import type { Brief } from '../../src/entities/brief/types.ts';
import { ApiError } from '../../src/shared/api/ApiError.ts';
import { dayjs, toKst } from '../../src/shared/lib/dayjs.ts';

// Task 8 앱이 같은 값으로 Android 알림 채널을 만든다.
export const NOTIFICATION_CHANNEL_ID = 'default';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CUTOFF_HOUR_KST = 9;
const TOP_COUNT = 2;
const EMPTY_BODY = '오늘은 기준에 맞는 새 뉴스가 없다';

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: { date: string; sha: string };
  channelId: typeof NOTIFICATION_CHANNEL_ID;
  priority: 'high';
  sound: 'default';
};

const ticketSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), id: z.string() }),
  z.object({
    status: z.literal('error'),
    message: z.string(),
    details: z.object({ error: z.string().optional() }).optional(),
  }),
]);
const responseSchema = z.object({ data: z.tuple([ticketSchema]) });

export const buildPushMessage = (brief: Brief, token: string, sha: string): PushMessage => {
  const md = dayjs(brief.date).format('M/D');
  const count = brief.items.length;
  const lines = brief.items.slice(0, TOP_COUNT).map((item, index) => {
    const holdings = item.stocks.filter((stock) => stock.watch === 'holding');
    const prefix = holdings.length > 0 ? `[보유 ${holdings.map((s) => s.name).join('·')}] ` : '';
    return `${index + 1}. ${prefix}${item.title}`;
  });
  return {
    to: token,
    title: count > 0 ? `AI 브리핑 ${md} · ${count}건` : `AI 브리핑 ${md}`,
    body: count > 0 ? lines.join('\n') : EMPTY_BODY,
    data: { date: brief.date, sha },
    channelId: NOTIFICATION_CHANNEL_ID,
    priority: 'high',
    sound: 'default',
  };
};

export const isPastCutoff = (nowIso: string): boolean => toKst(nowIso).hour() >= CUTOFF_HOUR_KST;

export const sendPush = async (
  message: PushMessage,
  fetchImpl: typeof fetch = fetch,
): Promise<string> => {
  const response = await fetchImpl(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept': 'application/json' },
    body: JSON.stringify([message]),
  });
  if (!response.ok) {
    throw new ApiError(response.status, `Expo Push 요청 실패 (HTTP ${response.status})`);
  }
  const [ticket] = responseSchema.parse(await response.json()).data;
  if (ticket.status === 'error') {
    const code = ticket.details?.error;
    // Expo가 오류 message에 토큰을 그대로 넣어 돌려주므로 로그에 남기 전에 가린다.
    const safeMessage = ticket.message.replaceAll(message.to, '[토큰]');
    throw new Error(`Expo Push ticket 오류${code ? ` ${code}` : ''}: ${safeMessage}`);
  }
  return ticket.id;
};
