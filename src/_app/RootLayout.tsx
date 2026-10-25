import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ApiError } from '@shared/api/ApiError';
import { COPY } from '@shared/config/copy';
import { colors } from '@shared/ui/theme';

const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;

// 429·5xx에서만 1회 재시도한다. 네트워크 끊김 등 나머지는 바로 에러 상태로 간다.
const shouldRetry = (failureCount: number, error: Error) =>
  failureCount < 1 &&
  error instanceof ApiError &&
  (error.status === HTTP_TOO_MANY_REQUESTS || error.status >= HTTP_SERVER_ERROR);

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } });

export const RootLayout = () => (
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
