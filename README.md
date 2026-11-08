# ai-news-brief

평일 아침 한국장 개장 전에, 밤사이 나온 AI 뉴스 중 주가에 영향을 줄 만한 것을 골라 폰 알림으로 보내 주는 개인용 브리핑이다. 나 혼자 안드로이드 APK로 쓴다. 브리핑은 참고 자료이고 매매 판단은 직접 한다.

## 구조

1. 예약 작업 `ai-news-brief`가 평일 07:37 KST(cron `37 22 * * 0-4`, UTC)에 클라우드 환경 `ai-news-brief`에서 돈다. 모델은 claude-sonnet-5-5다.
2. 에이전트가 `prompts/daily-brief.md`를 따라 `scripts/context.mts`로 날짜와 직전 브리핑을 읽고, 기사를 찾아 `briefs/<date>.json`을 쓴다.
3. `scripts/validateBrief.mts`로 검증하고 main에 커밋·push한 뒤 `scripts/sendPush.mts`가 Expo 푸시를 보낸다. 9:00 KST가 지나면 알림은 보내지 않는다.
4. 앱은 알림으로 열면 푸시에 실린 SHA, 그냥 열면 main 최신 SHA로 고정한 GitHub raw URL에서 브리핑을 읽는다.

`context.mts`는 주말과 `data/krx-holidays.json`의 휴장일을 개장일이 아닌 날로 처리한다. 이런 날은 파일도 커밋도 알림도 만들지 않는다.

## 개발 환경

Node 22.18 이상과 pnpm이 필요하다. `.mts`를 type stripping으로 바로 실행한다. 스크립트는 레포 루트에서 돌린다.

```bash
pnpm install
pnpm test
pnpm typecheck
```

## 종목과 선별 기준 고치기

- 보유·관심 종목은 `config/watchlist.json`의 `holdings`와 `interests`다. 항목은 `{ "market": "KR", "ticker": "005930", "name": "삼성전자" }` 꼴이다. `ticker`는 KR이면 숫자 6자리, US면 대문자 1~5자(`BRK.B` 허용)다. 형식이 틀리면 다음 실행에서 `context.mts`가 멈추니, 고친 뒤 레포 루트에서 `node scripts/context.mts`로 확인하고 push한다.
- 어떤 뉴스를 넣고 뺄지는 `prompts/daily-brief.md`다.

둘 다 Claude Code에 시켜서 고쳐도 된다. 예약 작업이 main을 읽으므로 push해야 다음 실행부터 반영된다.

## 휴장일 목록 갱신

`data/krx-holidays.json`의 `years`는 지금 2026년과 2027년을 덮는다. 올해가 `years`에 없으면 `context.mts`가 오류로 멈추고 그날은 브리핑도 알림도 오지 않는다. 갱신이 필요하다는 걸 알아차리도록 일부러 멈추게 했다.

매년 12월에 KRX 공지를 보고 다음 해 휴장일을 넣고 `years`를 고친다. 2027년 항목은 KRX 페이지에서 가져왔고 별도 공지와 대조하지 않았다. 2026년 12월에 다시 확인한다.

## 알림이 안 온 날

예약 작업 실행 기록과 로그를 먼저 본다: https://claude.ai/code/routines/trig_01AgZaGBcoBYenkNnSXF7dQc

흔히 이런 경우다.

- 휴장일이나 주말이라 건너뛰었다.
- 휴장일 목록이 올해를 덮지 않아 멈췄다.
- `config/watchlist.json` 형식 오류로 멈췄다.
- 실행이 늦어 9:00 KST를 넘겨 알림을 생략했다.
- 푸시 토큰이 무효가 됐다(`DeviceNotRegistered`). 앱을 지웠다 다시 깔면 토큰이 바뀌니, 앱의 "푸시 토큰 보기"로 다시 받아 클라우드 환경 변수 `EXPO_PUSH_TOKEN`을 바꾼다.

## 앱 다시 빌드하기

`expo-notifications`에 필요한 네이티브 모듈이 Expo Go에 없어서 Expo Go로는 앱이 돌지 않는다. 기기 확인은 APK로만 한다.

변경을 커밋한 뒤 빌드한다.

```bash
pnpm dlx eas-cli build -p android --profile preview
```

빌드가 끝나면 나온 APK URL을 폰에서 열어 설치한다. `eas.json`에서 `appVersionSource`가 `remote`라 `versionCode`는 EAS가 관리한다.

## 비밀값

비밀값은 커밋하지 않는다.

| 값                     | 있는 곳                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `EXPO_PUSH_TOKEN`      | 클라우드 환경 `ai-news-brief`의 환경 변수. https://claude.ai/code 의 환경 선택기에서 고친다    |
| `google-services.json` | 로컬은 레포 루트(gitignore). EAS 빌드는 `preview` 환경의 file 타입 변수 `GOOGLE_SERVICES_JSON` |
| FCM V1 서비스 계정 키  | EAS 자격 증명. `pnpm dlx eas-cli credentials` → Android → FCM V1                               |

푸시 토큰은 앱의 지난 브리핑 화면에서 "푸시 토큰 보기"를 눌러 받는다.
