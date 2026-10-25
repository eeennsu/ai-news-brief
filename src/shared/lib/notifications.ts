import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { z } from 'zod';

// scripts/lib/push.mts가 메시지에 같은 채널 ID를 실어 보낸다. 기기에 채널이 없으면 알림이 안 뜬다.
export const NOTIFICATION_CHANNEL_ID = 'default';

const { GRANTED } = Notifications.PermissionStatus;

export type PushTokenFailure = 'permission' | 'projectId';
export class PushTokenError extends Error {
  readonly reason: PushTokenFailure;
  constructor(reason: PushTokenFailure) {
    super(reason);
    this.reason = reason;
  }
}

// 알림 data는 외부 입력이다. 브리핑 화면이 받는 모양(날짜 + 40자리 SHA)과 같은 것만 통과시킨다.
const targetSchema = z.object({ date: z.iso.date(), sha: z.string().regex(/^[0-9a-f]{40}$/) });
export type NotificationTarget = z.infer<typeof targetSchema>;

// expo-constants의 extra는 any라서 zod로 거른다.
const projectIdOf = (source: unknown) =>
  z.object({ projectId: z.string().min(1) }).safeParse(source).data?.projectId;

export const registerForPushToken = async (): Promise<string> => {
  const projectId =
    projectIdOf(Constants.expoConfig?.extra?.eas) ?? projectIdOf(Constants.easConfig);
  if (!projectId) throw new PushTokenError('projectId');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== GRANTED) {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== GRANTED) throw new PushTokenError('permission');

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
};

export const useNotificationTarget = (): { id: string; target: NotificationTarget } | null => {
  const response = Notifications.useLastNotificationResponse();
  if (!response) return null;
  const parsed = targetSchema.safeParse(response.notification.request.content.data);
  if (!parsed.success) return null;
  return { id: response.notification.request.identifier, target: parsed.data };
};
