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
