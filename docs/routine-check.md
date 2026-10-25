# 예약 작업 실행 환경 점검

| # | 항목 | 결과 |
|---|------|------|
| 1 | 시작 시각 | `date -u`: Sun Oct 25 03:27:56 UTC 2026 / `date`: Sun Oct 25 03:27:56 UTC 2026 / TZ: unset |
| 2 | 버전 | node v22.22.0 / pnpm 10.28.0 / corepack 0.34.0 |
| 3 | WebSearch "NVIDIA stock news" | 성공. 1번 결과: "why nvidia stock is skyrocketing today" — https://theglobeandmail.com/investing/markets/markets-news/Motley%20Fool/31811937/why-nvidia-stock-is-skyrocketing-today |
| 4 | WebFetch (3번 URL) | 실패: `getaddrinfo ENOTFOUND theglobeandmail.com` (제목·발행 시각 확인 불가) |
| 5 | Expo push API curl | 응답 본문이 빈 문자열(출력 없음). HTTP 상태 코드는 `-s`만 써서 확인 불가 |
| 6 | EXPO_PUSH_TOKEN | unset |
| 7 | 끝난 시각 | Sun Oct 25 03:28:13 UTC 2026 |

## 2차 점검

| # | 항목 | 결과 |
|---|------|------|
| 1 | 시작 시각 | Sun Oct 25 04:08:36 UTC 2026 |
| 2 | WebSearch "NVIDIA stock news" (성공, 상위 3건) | ① why nvidia stock is skyrocketing today — https://theglobeandmail.com/investing/markets/markets-news/Motley%20Fool/31811937/why-nvidia-stock-is-skyrocketing-today ② why nvidia stock skyrocketing today 0 — https://www.nasdaq.com/articles/why-nvidia-stock-skyrocketing-today-0 ③ NVIDIA (NVDA) stock hits all-time high on bullish Q2 2024 forecast — https://shacknews.com/article/135644/nvidia-nvda-stock-rise-q2-2024-forecast?amphtml=1 |
| 3-① | WebFetch theglobeandmail | 실패: The server returned HTTP 404 Not Found. |
| 3-② | WebFetch nasdaq.com | 실패: The server returned HTTP 503 Service Unavailable. |
| 3-③ | WebFetch shacknews | 성공: 제목 "NVIDIA (NVDA) stock hits all-time high on bullish Q2 2024 forecast", 발행 2023-05-24 15:36 (작성자 TJ Denzer) |
| 4 | Expo push API curl | 성공(HTTP 200). 출력 전문: `{"data":[{"status":"error","message":"\"ExponentPushToken[routine-check]\" is not a valid Expo push token","details":{"error":"DeviceNotRegistered","expoPushToken":"ExponentPushToken[routine-check]"}}]}` / `HTTP 200` (가짜 토큰이므로 오류 응답은 예상된 동작) |
| 5 | 끝난 시각 | Sun Oct 25 04:08:54 UTC 2026 |
