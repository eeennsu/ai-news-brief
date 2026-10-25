import type { ExpoConfig } from 'expo/config';
import { z } from 'zod';

// process.env는 Expo 타입에서 any라서 zod로 거른다.
const googleServicesFile = z
  .string()
  .default('./google-services.json')
  .parse(process.env.GOOGLE_SERVICES_JSON);

// extra.eas.projectId는 `eas init` 뒤에 채운다. 없으면 푸시 토큰 발급이 오류 문구로 멈춘다.
const config: ExpoConfig = {
  name: 'ai-news-brief',
  slug: 'ai-news-brief',
  scheme: 'ainewsbrief',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  android: {
    package: 'dev.eeennsu.ainewsbrief',
    // EAS 빌드에는 file 타입 환경 변수가 이 경로를 채운다. 로컬에서는 레포 루트의 파일(커밋 금지)을 쓴다.
    googleServicesFile,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: ['expo-router', 'expo-status-bar', 'expo-notifications'],
};

export default config;
