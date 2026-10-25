import { z } from 'zod';

const tokenSchema = z.string().regex(/^Expo(nent)?PushToken\[.+\]$/);

// 값을 오류 메시지에 싣지 않는다: 토큰이 로그에 남으면 안 된다.
export const getPushToken = (): string => {
  const parsed = tokenSchema.safeParse(process.env.EXPO_PUSH_TOKEN);
  if (!parsed.success) throw new Error('EXPO_PUSH_TOKEN이 없거나 형식이 다르다');
  return parsed.data;
};
