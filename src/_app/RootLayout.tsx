import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { ApiError } from '@shared/api/ApiError';
import { COPY } from '@shared/config/copy';
import { useNotificationTarget } from '@shared/lib/notifications';
import { colors } from '@shared/ui/theme';

const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;

// 429·5xx에서만 1회 재시도한다. 네트워크 끊김 등 나머지는 바로 에러 상태로 간다.
const shouldRetry = (failureCount: number, error: Error) =>
  failureCount < 1 &&
  error instanceof ApiError &&
  (error.status === HTTP_TOO_MANY_REQUESTS || error.status >= HTTP_SERVER_ERROR);

// RN에는 window focus 이벤트가 없어 앱이 활성 상태로 돌아올 때를 focusManager에 알려 준다.
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (status) => {
    handleFocus(status === 'active');
  });
  return () => subscription.remove();
});

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } });

// 모듈 변수라 RootLayout이 다시 마운트돼도 같은 알림 응답으로 다시 이동하지 않는다.
let handledNotificationId: string | null = null;

export const RootLayout = () => {
  const router = useRouter();
  const notification = useNotificationTarget();
  const notificationId = notification?.id;
  const date = notification?.target.date;
  const sha = notification?.target.sha;

  // 앱이 꺼진 상태에서 누른 알림도 useLastNotificationResponse로 온다.
  useEffect(() => {
    if (!notificationId || !date || !sha || notificationId === handledNotificationId) return;
    handledNotificationId = notificationId;
    router.push({ pathname: '/brief/[date]', params: { date, sha } });
  }, [notificationId, date, sha, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style='dark' />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name='index' options={{ title: COPY.today.title }} />
        <Stack.Screen name='archive' options={{ title: COPY.archive.title }} />
        <Stack.Screen name='brief/[date]' options={{ title: '' }} />
      </Stack>
    </QueryClientProvider>
  );
};
