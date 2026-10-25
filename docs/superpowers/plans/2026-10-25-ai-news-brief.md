# ai-news-brief 구현 계획서

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 평일 아침 Claude Code 예약 작업이 AI 뉴스 브리핑 JSON을 만들어 main에 push하고 Expo 푸시로 Top 2를 보내면, Android 앱이 그 브리핑과 지난 브리핑을 보여 준다.

**Architecture:** 생성은 예약 작업(Sonnet)이 `prompts/daily-brief.md`를 따라 한다. 날짜·직전 브리핑 계산, 브리핑 검증, 푸시 발송처럼 기계로 판정할 수 있는 일은 `scripts/*.mts`(node로 바로 실행)가 맡고, AI는 검색·선별·요약·판정만 한다. 앱(Expo Router)은 커밋 SHA로 고정한 raw URL에서 브리핑을 읽어 raw 캐시를 피한다. 알림에는 `{ date, sha }`가 실린다.

**Tech Stack:** pnpm, TypeScript, Expo SDK 58(Expo Router), TanStack Query, zod 4, dayjs, Node 내장 테스트 러너(`node --test`), EAS Build(APK), Expo Push Service

**Spec:** `docs/superpowers/specs/2026-10-25-ai-news-brief-design.md`

## Global Constraints

- 코드 작성 전 conventions 스킬을 읽는다. 이 계획의 Task 2가 스캐폴드하는 TS 프로젝트다.
- Expo는 스캐폴드 시점의 최신 안정 SDK를 쓴다. 2026-10-25 기준 SDK 58(2026-10-15 출시, https://expo.dev/changelog/sdk-58, 확인일 2026-10-25). 다른 버전이 깔리면 그 버전 문서를 따른다.
- Node는 22.18 이상이다. 이 버전부터 type stripping이 기본으로 켜져 `.ts`·`.mts`를 플래그 없이 실행한다(https://nodejs.org/api/typescript.html, 확인일 2026-10-25). `package.json`에 `"engines": { "node": ">=22.18" }`를 둔다. tsx 같은 실행기는 넣지 않는다.
- `scripts/`의 파일은 `.mts`이고, 상대 import에 확장자(`.mts`·`.ts`)를 붙인다. scripts가 import하는 `src/` 파일(`src/entities/brief/contracts.ts`, `src/shared/lib/dayjs.ts`)은 npm 패키지만 import한다. Node는 alias와 확장자 없는 import를 풀지 못한다.
- dayjs 플러그인은 `dayjs/plugin/utc.js`처럼 `.js`까지 적어 import한다. dayjs에는 exports 맵이 없어 Node ESM이 확장자를 요구한다.
- KST는 UTC+9 고정이다(서머타임 없음). 시간대 플러그인 없이 `utcOffset(540)`으로 다룬다.
- 윈도우와 맥에서 같은 명령이 돌아야 한다. `package.json` scripts에는 셸 문법 없이 `node`·`eslint`·`tsc`·`prettier`·`expo` 명령만 쓴다.
- 레포는 공개 `eeennsu/ai-news-brief`, 브랜치는 `main`이다. 비밀값(`EXPO_PUSH_TOKEN`, `google-services.json`, FCM 서비스 계정 키)은 커밋하지 않는다.
- 앱 화면에는 매매 행동 제안 문구(매수·매도·비중·관망)를 넣지 않는다.
- 스타일은 StyleSheet로 한다. 화면이 셋뿐이라 NativeWind는 들이지 않는다.
- 커밋 메시지는 한국어이고, 접두어는 `feat:` `fix:` `refactor:` `chore:` `docs:` `update:`만 쓴다.
- 브리핑은 최대 10건, 알림 본문은 Top 2, 9:00 KST 이후에는 알림을 보내지 않는다.

## Review Focus

- 첫 브리핑이라 직전 브리핑이 없을 때: 생성 시각 24시간 전 이후 뉴스만 받는다. Task 3 `getSince` 테스트.
- 휴장일 목록이 올해를 덮지 않을 때(연초에 갱신을 잊음): 개장일로 추측하지 않고 오류로 멈춘다. 그날 알림이 없어 사용자가 알아챈다. Task 3 `getTradingDay` 테스트.
- AI가 종목 코드를 `005930.KS`·`nvda`처럼 다른 형식으로 쓸 때: 보유 종목 강조가 조용히 빠진다. 스키마가 코드 형식을 거르고 `watch`가 설정과 맞는지 검사한다. Task 3 스키마 테스트와 Task 4 `checkBrief` 테스트.
- 같은 날 다시 돌릴 때(Run now): 오늘 파일을 직전 브리핑으로 잡지 않고 덮어쓴다. Task 3 `findPreviousDate` 테스트.
- git push가 실패했는데 알림이 나갈 때: 앱이 그 SHA에서 파일을 못 찾는다. 발송 전에 `origin/main`에 오늘 파일이 있는지 확인하고, Expo가 ticket 오류(`DeviceNotRegistered` 등)를 주면 실패로 끝낸다. Task 5.

---

## 파일 구조

```
prompts/daily-brief.md          예약 작업 지시문
config/watchlist.json           보유·관심 종목
data/krx-holidays.json          한국장 휴장일
briefs/YYYY-MM-DD.json          날짜별 브리핑
scripts/
  context.mts                   오늘 날짜·개장일·직전 브리핑을 JSON으로 출력
  validateBrief.mts             브리핑 파일 검증
  sendPush.mts                  Top 2 알림 발송
  lib/schemas.mts               watchlist·holidays zod 스키마
  lib/files.mts                 JSON 읽기, 브리핑 목록
  lib/context.mts (+ .test.mts) 개장일·직전 날짜·since 계산
  lib/checkBrief.mts (+ .test.mts)
  lib/push.mts (+ .test.mts)    메시지 조립·컷오프·발송
  lib/env.mts                   EXPO_PUSH_TOKEN 검증
  lib/contracts.test.mts        브리핑 스키마 테스트
app/                            Expo Router 라우트(재수출만)
  _layout.tsx  index.tsx  archive.tsx  brief/[date].tsx
src/
  _app/RootLayout.tsx           Stack, QueryClientProvider, 알림 탭 처리
  screens/{today,archive,brief}/  index.ts, ui/*Screen.tsx
  widgets/briefView/            index.ts, ui/BriefView.tsx, ui/NewsCard.tsx
  features/brief/               index.ts, apis/github.ts, hooks/*.ts
  features/pushToken/           index.ts, ui/PushTokenPanel.tsx
  entities/brief/               index.ts, contracts.ts, types.ts, consts.ts
  shared/lib/dayjs.ts  shared/lib/notifications.ts
  shared/api/ApiError.ts  shared/api/queryKeys.ts
  shared/config/repo.ts  shared/config/copy.ts
  shared/ui/StateView.tsx
docs/routine-check.md           Task 1 검증 결과
```

---

### Task 1: 예약 작업 실행 방식 검증

설계 문서의 "구현 첫 단계"다. 코드는 쓰지 않는다. 결과가 하나라도 안 되면 Task 2로 가지 않고 사용자에게 다시 묻는다(대안: GitHub Actions cron + Claude API 웹 검색 도구).

**Files:**
- Create: `docs/routine-check.md`

- [ ] **Step 1: GitHub 공개 레포를 만든다**

외부에 공개되는 작업이라 실행 전에 사용자에게 확인을 받는다.

Run: `gh repo create eeennsu/ai-news-brief --public --source . --push`
Expected: `https://github.com/eeennsu/ai-news-brief`가 생기고 main에 기존 커밋 2개가 올라간다.

- [ ] **Step 2: 사용자가 클라우드 환경을 만든다**

사용자에게 claude.ai/code의 클라우드 환경 설정에서 아래를 하도록 안내한다(https://code.claude.com/docs/en/cloud-environments).
- 환경 변수 `EXPO_PUSH_TOKEN=ExponentPushToken[routine-check]` (가짜 값. Task 9에서 진짜로 바꾼다)
- 네트워크: `exp.host`가 기본 허용 목록에 없으면 Custom 네트워크로 `exp.host`를 연다

- [ ] **Step 3: 테스트 예약 작업을 만들고 Run now로 돌린다**

`schedule` 스킬로 레포 `eeennsu/ai-news-brief`, 모델 Sonnet, 위 환경을 쓰는 예약 작업 `ai-news-brief-check`를 만든다. 일정은 아무 값이나 두고 Run now로 한 번 돌린다. 프롬프트:

```text
아래를 순서대로 하고, 각 항목의 결과를 docs/routine-check.md에 표로 적는다. 실패한 항목도 실패라고 적고 다음으로 넘어간다.
1. 시작 시각: `date -u`와 `date` 출력, TZ 환경 변수
2. `node -v`, `pnpm -v`, `corepack --version` 출력
3. WebSearch로 "NVIDIA stock news"를 검색해 결과 1건의 제목과 URL
4. 3번 URL을 WebFetch로 열어 기사 제목과 발행 시각
5. curl -s -X POST https://exp.host/--/api/v2/push/send -H 'content-type: application/json' -d "[{\"to\":\"$EXPO_PUSH_TOKEN\",\"body\":\"check\"}]" 의 응답 전문
6. 끝난 시각: `date -u`
그다음 `git add docs/routine-check.md && git commit -m "chore: 예약 작업 실행 환경을 기록한다"`를 하고 main에 직접 push한다.
```

- [ ] **Step 4: 결과를 판정한다**

`git pull` 뒤 `docs/routine-check.md`와 예약 작업 실행 기록을 보고 아래를 표로 정리해 사용자에게 보고한다.

| 항목 | 통과 조건 |
| --- | --- |
| WebSearch | 3번에 실제 결과가 있다 |
| WebFetch | 4번에 제목·발행 시각이 있다(실패면 지시문의 기사 확인 방식을 바꿔야 하니 묻는다) |
| main push | 커밋이 origin/main에 있다 |
| exp.host | 5번 응답이 Expo의 JSON이다(가짜 토큰이라 ticket은 error여도 된다) |
| Node·pnpm | Node 22.18 이상, pnpm 또는 corepack이 있다 |
| cron | 예약 작업 일정 UI·문서에서 타임존(UTC/로컬)과 요일 지정 가능 여부를 적는다. 요일 지정이 안 돼도 `context.mts`가 주말을 거르므로 매일 실행으로 대신할 수 있다 |
| 소요 시간 | 1번과 6번 차이. 본 실행은 이보다 길다. 실측은 Task 9에서 한다 |

결과와 확인일(실행한 날)을 `docs/routine-check.md` 맨 위에 덧붙인다.

- [ ] **Step 5: 커밋한다**

```bash
git add docs/routine-check.md
git commit -m "docs: 예약 작업 검증 결과를 정리한다"
git push
```

테스트 예약 작업 `ai-news-brief-check`는 지운다.

---

### Task 2: Expo 앱 스캐폴드와 컨벤션 프리셋

**Files:**
- Create: Expo 템플릿 파일 일체, `eslint.config.mjs`, `prettier.config.mjs`, `CLAUDE.md`, `.claude/settings.json`, `scripts/lib/smoke.test.mts`(Step 5에서 지운다)
- Modify: `package.json`, `tsconfig.json`, `.gitignore`

**Interfaces:**
- Produces: `pnpm test`(= `node --test "scripts/**/*.test.mts"`), `pnpm typecheck`, `pnpm lint`, `pnpm format:check`. tsconfig에 레이어 alias와 `allowImportingTsExtensions: true`, `erasableSyntaxOnly: true`, `include`에 `scripts/**/*.mts`.

- [ ] **Step 1: 템플릿을 깐다**

레포 폴더가 비어 있지 않으니 임시 폴더에 만들고 옮긴다: `pnpm create expo-app <임시>/ai-news-brief --template blank-typescript`. `.git`과 `docs/`를 건드리지 않고 생성물을 레포 루트로 옮긴다. 이어서 Expo Router를 설치 문서대로 붙인다(`expo:expo-router` 스킬, `npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar`, `"main": "expo-router/entry"`, app 설정에 `scheme: "ainewsbrief"`). `App.tsx`·`index.ts`는 지운다.

- [ ] **Step 2: conventions 프리셋을 깐다**

conventions 스킬 `references/setup.md` 절차를 Expo 기준으로 따른다. RN이므로 alias는 `@screens/*`만 남기고 `@pages/*`를 지운다. tsconfig에 `allowImportingTsExtensions: true`, `erasableSyntaxOnly: true`를 더하고 `include`에 `"scripts/**/*.mts"`를 넣는다. `package.json` scripts에 `lint`·`format`·`format:check`·`typecheck`(`tsc --noEmit`)와 `"test": "node --test \"scripts/**/*.test.mts\""`를 넣는다.

- [ ] **Step 3: 프로젝트 Claude 설정을 만든다**

`.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "expo@claude-plugins-official": true,
    "building-react-native-apps@callstack-agent-skills": true,
    "testing-react-native-apps@callstack-agent-skills": true,
    "mobile-taste-skill@my-agent-setup": true
  }
}
```

`CLAUDE.md`에 다음을 적는다: `@~/my-agent-setup/docs/rn.md` 한 줄, "코드 컨벤션은 conventions 스킬을 따른다" 한 줄, Global Constraints의 scripts 규칙 세 줄(`.mts`·확장자 import, scripts가 import하는 src 파일은 패키지만 import, dayjs 플러그인 `.js`), "보유·관심 종목은 `config/watchlist.json`, 선별 기준은 `prompts/daily-brief.md`를 고친다" 한 줄.

- [ ] **Step 4: 테스트 러너가 도는지 본다**

`scripts/lib/smoke.test.mts`에 `test('러너가 돈다', () => assert.equal(1, 1))`를 넣는다.

Run: `pnpm test`
Expected: `pass 1`, `fail 0`

- [ ] **Step 5: 검사를 통과시킨다**

smoke 테스트를 지우고 setup.md 9단계의 경계 확인(위반 import 한 줄이 `boundaries/dependencies`로 잡히는지)을 한 뒤 지운다.

Run: `pnpm typecheck; pnpm lint; pnpm format:check`
Expected: 셋 다 종료 코드 0

- [ ] **Step 6: 커밋한다**

```bash
git add -A
git commit -m "chore: Expo 앱을 스캐폴드하고 컨벤션 프리셋을 깐다"
```

---

### Task 3: 브리핑 계약과 생성 컨텍스트 스크립트

**Files:**
- Create: `src/entities/brief/contracts.ts`, `src/entities/brief/types.ts`, `src/entities/brief/consts.ts`, `src/entities/brief/index.ts`, `src/shared/lib/dayjs.ts`, `scripts/lib/schemas.mts`, `scripts/lib/files.mts`, `scripts/lib/context.mts`, `scripts/context.mts`, `config/watchlist.json`, `data/krx-holidays.json`, `briefs/.gitkeep`
- Test: `scripts/lib/contracts.test.mts`, `scripts/lib/context.test.mts`

**Interfaces:**
- Produces:
  - `contracts.ts`: `briefSchema`, `newsItemSchema`, `stockSchema`, `MARKETS = { US: 'US', KR: 'KR' } as const`, `VERDICTS = { positive, negative, neutral }`, `STRENGTHS = { weak, medium, strong }`, `WATCH = { holding, interest }` (모두 값이 키와 같은 문자열 `as const`), `BRIEF_MAX_ITEMS = 10`
  - `types.ts`: `Brief`, `NewsItem`, `Stock`, `Market`, `Verdict`, `Strength`, `Watch` (zod 추론)
  - `dayjs.ts`: `dayjs`(utc 플러그인 적용), `KST_OFFSET_MINUTES = 540`, `nowKst(): Dayjs`, `toKst(iso: string): Dayjs`
  - `schemas.mts`: `watchlistSchema`, `holidaysSchema`, 타입 `Watchlist`, `Holidays`
  - `files.mts`: `readJson<T>(path: string, schema: z.ZodType<T>): T`, `listBriefNames(dir?: string): string[]`(기본 `briefs`), `BRIEFS_DIR = 'briefs'`
  - `lib/context.mts`: `getTradingDay(date: string, holidays: Holidays): { tradingDay: true } | { tradingDay: false; reason: 'weekend' | 'holiday' }`, `findPreviousDate(names: string[], date: string): string | null`, `getSince(previousGeneratedAt: string | null, now: string): string`
  - CLI `node scripts/context.mts [--force]` → stdout JSON `{ now, date, tradingDay, reason?, since, previous: { date, generatedAt, urls } | null, watchlist }`

스키마 규칙:
- `briefSchema = { date: z.iso.date(), generatedAt: z.iso.datetime({ offset: true }), items: z.array(newsItemSchema).max(BRIEF_MAX_ITEMS) }`
- `newsItemSchema = { title, summary, source: 비지 않은 문자열, url: https URL, publishedAt: z.iso.datetime({ offset: true }), stocks: z.array(stockSchema).min(1) }`
- `stockSchema = { market, ticker, name, verdict, strength, reason: 비지 않은 문자열, watch: WATCH 값 또는 null }`. ticker는 KR이면 `/^\d{6}$/`, US면 `/^[A-Z]{1,5}(\.[A-Z])?$/`(BRK.B)를 refine으로 건다.
- `watchlistSchema = { holdings, interests }`, 각 원소 `{ market, ticker, name }`. 같은 ticker 규칙을 쓴다.
- `holidaysSchema = { source: URL, checkedAt: z.iso.date(), years: number[], dates: z.iso.date()[] }`

zod 4 API 이름(`z.iso.date`, `z.iso.datetime`, `z.url`)은 깔린 zod 문서로 확인하고, 다르면 같은 뜻의 API로 바꾼다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`scripts/lib/contracts.test.mts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { briefSchema } from '../../src/entities/brief/contracts.ts';

const stock = { market: 'KR', ticker: '000660', name: 'SK하이닉스', verdict: 'positive', strength: 'strong', reason: 'HBM 수요', watch: null };
const item = { title: 't', summary: 's', source: 'Reuters', url: 'https://example.com/a', publishedAt: '2026-10-26T06:00:00+09:00', stocks: [stock] };
const brief = (items: unknown[]) => ({ date: '2026-10-26', generatedAt: '2026-10-26T07:37:00+09:00', items });

test('맞는 브리핑은 통과한다', () => assert.equal(briefSchema.safeParse(brief([item])).success, true));
test('빈 브리핑도 통과한다', () => assert.equal(briefSchema.safeParse(brief([])).success, true));
test('11건이면 거른다', () => assert.equal(briefSchema.safeParse(brief(Array(11).fill(item))).success, false));
test('종목이 없는 뉴스는 거른다', () => assert.equal(briefSchema.safeParse(brief([{ ...item, stocks: [] }])).success, false));
test('KR 코드에 접미사가 붙으면 거른다', () =>
  assert.equal(briefSchema.safeParse(brief([{ ...item, stocks: [{ ...stock, ticker: '000660.KS' }] }])).success, false));
test('US 코드가 소문자면 거른다', () =>
  assert.equal(briefSchema.safeParse(brief([{ ...item, stocks: [{ ...stock, market: 'US', ticker: 'nvda' }] }])).success, false));
test('http 링크는 거른다', () => assert.equal(briefSchema.safeParse(brief([{ ...item, url: 'http://example.com/a' }])).success, false));
test('시간대 없는 발행 시각은 거른다', () =>
  assert.equal(briefSchema.safeParse(brief([{ ...item, publishedAt: '2026-10-26T06:00:00' }])).success, false));
```

`scripts/lib/context.test.mts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findPreviousDate, getSince, getTradingDay } from './context.mts';

const holidays = { source: 'https://open.krx.co.kr', checkedAt: '2026-10-25', years: [2026], dates: ['2026-12-25'] };

test('평일이고 휴장일이 아니면 개장일이다', () => assert.deepEqual(getTradingDay('2026-10-26', holidays), { tradingDay: true }));
test('주말은 개장일이 아니다', () => assert.deepEqual(getTradingDay('2026-10-25', holidays), { tradingDay: false, reason: 'weekend' }));
test('휴장일 목록에 있으면 개장일이 아니다', () =>
  assert.deepEqual(getTradingDay('2026-12-25', holidays), { tradingDay: false, reason: 'holiday' }));
test('목록이 그해를 덮지 않으면 평일에 throw한다', () => assert.throws(() => getTradingDay('2027-01-04', holidays), /2027/));
test('직전 브리핑은 오늘보다 앞선 가장 늦은 날짜다', () =>
  assert.equal(findPreviousDate(['2026-10-22.json', '2026-10-26.json', '2026-10-23.json', '.gitkeep'], '2026-10-26'), '2026-10-23'));
test('직전 브리핑이 없으면 null이다', () => assert.equal(findPreviousDate(['2026-10-26.json'], '2026-10-26'), null));
test('since는 직전 생성 시각이다', () =>
  assert.equal(getSince('2026-10-23T07:40:00+09:00', '2026-10-26T07:37:00+09:00'), '2026-10-23T07:40:00+09:00'));
test('직전이 없으면 since는 24시간 전이다', () =>
  assert.equal(getSince(null, '2026-10-26T07:37:00+09:00'), '2026-10-25T07:37:00+09:00'));
```

- [ ] **Step 2: 실패를 확인한다**

Run: `pnpm test`
Expected: FAIL, `ERR_MODULE_NOT_FOUND`(contracts.ts·context.mts 없음)

- [ ] **Step 3: 계약·dayjs·스키마·계산 함수를 구현한다**

위 Interfaces대로 만든다. `getTradingDay`는 주말 판정을 먼저 하고, 평일인데 `years`에 그해가 없으면 `휴장일 목록이 ${year}년을 덮지 않는다. data/krx-holidays.json을 갱신한다` 오류를 던진다. 요일은 `dayjs.utc(date).day()`로 본다. `getSince`는 KST 오프셋 문자열(`dayjs().format()` 형식)로 돌려준다.

- [ ] **Step 4: 통과를 확인한다**

Run: `pnpm test`
Expected: 16개 모두 PASS

- [ ] **Step 5: 데이터 파일과 CLI를 만든다**

- `config/watchlist.json`: `{ "holdings": [], "interests": [] }`로 둔다. 실제 종목은 사용자가 Claude Code로 채운다.
- `data/krx-holidays.json`: 한국거래소 공식 휴장일 안내(KRX 정보데이터시스템 등)에서 2026년 남은 휴장일과, 발표됐다면 2027년 휴장일을 가져온다. 연말 휴장일(12/31)을 빠뜨리지 않는다. `source`에 가져온 URL, `checkedAt`에 확인일, `years`에 다 채운 해만 넣는다. 공식 출처를 못 찾으면 멈추고 사용자에게 묻는다.
- `scripts/context.mts`: `nowKst()`로 `now`·`date`를 정하고, 휴장일·watchlist·직전 브리핑 파일을 읽어 Interfaces의 JSON을 출력한다. 개장일이 아니면 `tradingDay: false`와 `reason`을 출력하고 종료 코드 0으로 끝낸다. `--force`면 개장일 판정을 건너뛰고 `tradingDay: true`로 출력한다(시험 실행용). `previous.urls`는 직전 브리핑 items의 url 목록이다.

Run: `node scripts/context.mts --force`
Expected: `"previous": null`, `since`가 `now`의 24시간 전인 JSON

- [ ] **Step 6: 검사 후 커밋한다**

Run: `pnpm typecheck; pnpm lint; pnpm format:check`
Expected: 종료 코드 0

```bash
git add src/entities src/shared/lib/dayjs.ts scripts config data briefs/.gitkeep package.json pnpm-lock.yaml
git commit -m "feat: 브리핑 스키마와 생성 컨텍스트 스크립트를 추가한다"
```

---

### Task 4: 브리핑 검증 스크립트

**Files:**
- Create: `scripts/lib/checkBrief.mts`, `scripts/validateBrief.mts`
- Test: `scripts/lib/checkBrief.test.mts`

**Interfaces:**
- Consumes: `Brief`(Task 3 `types.ts`), `Watchlist`, `getSince`, `findPreviousDate`, `readJson`, `listBriefNames`
- Produces:
  - `checkBrief(brief: Brief, ctx: { previous: Brief | null; watchlist: Watchlist; now: string }): string[]` 오류 문구 목록. 각 문구는 `items[<i>].<필드>: ` 경로로 시작한다(브리핑 전체 오류는 `<필드>: `).
  - CLI `node scripts/validateBrief.mts briefs/<date>.json` → 통과면 `OK` 출력·종료 코드 0, 아니면 스키마 오류와 `checkBrief` 오류를 한 줄씩 출력·종료 코드 1

검사 규칙(`since = getSince(previous?.generatedAt ?? null, brief.generatedAt)`):
1. `publishedAt`이 `since` 이후다.
2. `publishedAt`과 `generatedAt`이 `now` 이전이다.
3. url이 직전 브리핑 items에 없고, 브리핑 안에서 겹치지 않는다.
4. 종목마다 `watch`가 `(market, ticker)`로 watchlist를 찾은 값과 같다(holdings면 `holding`, interests면 `interest`, 없으면 `null`. 둘 다에 있으면 `holding`).
5. 보유 종목(`watch === 'holding'`)이 걸린 뉴스는 그렇지 않은 뉴스보다 앞에 온다. 어긴 뉴스마다 `items[<i>]: `로 시작하는 오류를 낸다.

CLI는 파일 이름이 `${brief.date}.json`인지도 보고, 직전 브리핑은 `findPreviousDate(listBriefNames(), brief.date)`로 찾는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Brief, NewsItem, Stock } from '../../src/entities/brief/types.ts';
import { checkBrief } from './checkBrief.mts';
import type { Watchlist } from './schemas.mts';

const watchlist: Watchlist = {
  holdings: [{ market: 'US', ticker: 'NVDA', name: '엔비디아' }],
  interests: [{ market: 'KR', ticker: '000660', name: 'SK하이닉스' }],
};
const stock = (o: Partial<Stock> = {}): Stock => ({ market: 'US', ticker: 'AMD', name: 'AMD', verdict: 'neutral', strength: 'weak', reason: '근거', watch: null, ...o });
const item = (o: Partial<NewsItem> = {}): NewsItem => ({ title: '제목', summary: '요약', url: 'https://example.com/a', source: 'Reuters', publishedAt: '2026-10-26T06:00:00+09:00', stocks: [stock()], ...o });
const brief = (items: NewsItem[]): Brief => ({ date: '2026-10-26', generatedAt: '2026-10-26T07:37:00+09:00', items });
const previous: Brief = { date: '2026-10-23', generatedAt: '2026-10-23T07:40:00+09:00', items: [item({ url: 'https://example.com/old', publishedAt: '2026-10-23T06:00:00+09:00' })] };
const ctx = { previous, watchlist, now: '2026-10-26T07:50:00+09:00' };
const holding = stock({ ticker: 'NVDA', name: '엔비디아', watch: 'holding' });

test('규칙에 맞으면 오류가 없다', () => assert.deepEqual(checkBrief(brief([item()]), ctx), []));
test('빈 브리핑은 통과한다', () => assert.deepEqual(checkBrief(brief([]), ctx), []));
test('직전 생성 시각 이전 기사를 잡는다', () => {
  const errors = checkBrief(brief([item({ publishedAt: '2026-10-23T07:00:00+09:00' })]), ctx);
  assert.equal(errors.length, 1);
  assert.match(errors[0] ?? '', /^items\[0\]\.publishedAt: /);
});
test('직전이 없으면 24시간보다 오래된 기사를 잡는다', () =>
  assert.equal(checkBrief(brief([item({ publishedAt: '2026-10-25T07:00:00+09:00' })]), { ...ctx, previous: null }).length, 1));
test('미래 발행 시각을 잡는다', () =>
  assert.match(checkBrief(brief([item({ publishedAt: '2026-10-26T08:00:00+09:00' })]), ctx)[0] ?? '', /^items\[0\]\.publishedAt: /));
test('직전 브리핑에 실린 URL을 잡는다', () =>
  assert.match(checkBrief(brief([item({ url: 'https://example.com/old' })]), ctx)[0] ?? '', /^items\[0\]\.url: /));
test('브리핑 안의 중복 URL을 잡는다', () =>
  assert.match(checkBrief(brief([item(), item()]), ctx)[0] ?? '', /^items\[1\]\.url: /));
test('보유 종목인데 watch가 null이면 잡는다', () =>
  assert.match(checkBrief(brief([item({ stocks: [stock({ ticker: 'NVDA', name: '엔비디아' })] })]), ctx)[0] ?? '', /^items\[0\]\.stocks\[0\]\.watch: /));
test('관심 종목을 holding으로 적으면 잡는다', () =>
  assert.equal(checkBrief(brief([item({ stocks: [stock({ market: 'KR', ticker: '000660', name: 'SK하이닉스', watch: 'holding' })] })]), ctx).length, 1));
test('보유 종목 뉴스가 비보유 뉴스 뒤에 오면 잡는다', () =>
  assert.match(checkBrief(brief([item(), item({ url: 'https://example.com/b', stocks: [holding] })]), ctx)[0] ?? '', /^items\[1\]: /));
test('보유 종목 뉴스가 앞이면 통과한다', () =>
  assert.deepEqual(checkBrief(brief([item({ url: 'https://example.com/b', stocks: [holding] }), item()]), ctx), []));
```

- [ ] **Step 2: 실패를 확인한다**

Run: `pnpm test`
Expected: checkBrief 테스트가 `ERR_MODULE_NOT_FOUND`로 FAIL

- [ ] **Step 3: `checkBrief`와 CLI를 구현한다**

시각 비교는 `dayjs(a).isAfter(b)`처럼 파싱해서 한다(문자열 비교 금지, 오프셋이 다를 수 있다). 오류 문구 뒤쪽은 사람이 읽고 고칠 수 있게 쓴다. 예: `items[0].publishedAt: 직전 브리핑 생성 시각(2026-10-23T07:40:00+09:00) 이전 기사다`.

- [ ] **Step 4: 통과를 확인한다**

Run: `pnpm test`
Expected: 전부 PASS

- [ ] **Step 5: 검사 후 커밋한다**

Run: `pnpm typecheck; pnpm lint; pnpm format:check`

```bash
git add scripts
git commit -m "feat: 브리핑 검증 스크립트를 추가한다"
```

---

### Task 5: 푸시 발송 스크립트

**Files:**
- Create: `scripts/lib/push.mts`, `scripts/lib/env.mts`, `scripts/sendPush.mts`
- Test: `scripts/lib/push.test.mts`

**Interfaces:**
- Consumes: `Brief`, `briefSchema`, `readJson`, `toKst`, `nowKst`
- Produces:
  - `type PushMessage = { to: string; title: string; body: string; data: { date: string; sha: string }; channelId: 'default'; priority: 'high'; sound: 'default' }`
  - `NOTIFICATION_CHANNEL_ID = 'default'` (Task 8 앱이 같은 값으로 채널을 만든다)
  - `buildPushMessage(brief: Brief, token: string, sha: string): PushMessage`
  - `isPastCutoff(nowIso: string): boolean` — KST 9:00 이후면 true
  - `sendPush(message: PushMessage, fetchImpl?: typeof fetch): Promise<string>` — ticket id를 돌려준다. `https://exp.host/--/api/v2/push/send`에 `[message]` 배열로 POST하고(`content-type`·`accept: application/json`), HTTP 오류면 status를 담아, ticket `status: 'error'`면 `details.error`와 `message`를 담아 throw한다. 응답은 zod로 파싱한다.
  - `env.mts`: `getPushToken(): string` — `process.env.EXPO_PUSH_TOKEN`을 `/^Expo(nent)?PushToken\[.+\]$/`로 검증. env는 이 모듈에서만 읽는다.
  - CLI `node scripts/sendPush.mts briefs/<date>.json [--ignore-cutoff]`

메시지 형식(Expo 요청·응답 형식 출처: https://docs.expo.dev/push-notifications/sending-notifications/, 확인일 2026-10-25):
- 제목: `AI 브리핑 ${M/D} · ${n}건`, 0건이면 `AI 브리핑 ${M/D}`
- 본문: Top 2를 `${순번}. ${보유 접두어}${title}`로 한 줄씩, `\n`으로 잇는다. 보유 접두어는 그 뉴스에 `watch === 'holding'` 종목이 있으면 `[보유 ${name을 '·'로 이음}] `, 없으면 빈 문자열. 0건이면 `오늘은 기준에 맞는 새 뉴스가 없다`.

CLI 순서: 브리핑 파싱 → `--ignore-cutoff`가 없고 `isPastCutoff(nowKst().format())`면 `9:00 KST가 지나 알림을 보내지 않는다`를 출력하고 종료 코드 0 → `git cat-file -e origin/main:briefs/<date>.json`이 실패하면 `origin/main에 브리핑이 없다. push를 확인한다`로 종료 코드 1 → `sha = git rev-parse origin/main` → `getPushToken()` → `sendPush` → ticket id 출력. git은 `node:child_process`의 `execFileSync`로 부른다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Brief, NewsItem, Stock } from '../../src/entities/brief/types.ts';
import { buildPushMessage, isPastCutoff, sendPush } from './push.mts';

const stock = (o: Partial<Stock> = {}): Stock => ({ market: 'US', ticker: 'AMD', name: 'AMD', verdict: 'neutral', strength: 'weak', reason: '근거', watch: null, ...o });
const item = (title: string, stocks: Stock[] = [stock()]): NewsItem => ({ title, summary: '요약', url: `https://example.com/${title}`, source: 'Reuters', publishedAt: '2026-10-26T06:00:00+09:00', stocks });
const brief = (items: NewsItem[]): Brief => ({ date: '2026-10-26', generatedAt: '2026-10-26T07:37:00+09:00', items });
const TOKEN = 'ExponentPushToken[x]';

test('Top 2를 한 줄씩 넣고 보유 종목을 앞에 표시한다', () => {
  const holdings = [stock({ ticker: 'NVDA', name: '엔비디아', watch: 'holding' }), stock({ market: 'KR', ticker: '000660', name: 'SK하이닉스', watch: 'holding' })];
  assert.deepEqual(buildPushMessage(brief([item('HBM 공급 확대', holdings), item('B'), item('C')]), TOKEN, 'abc123'), {
    to: TOKEN,
    title: 'AI 브리핑 10/26 · 3건',
    body: '1. [보유 엔비디아·SK하이닉스] HBM 공급 확대\n2. B',
    data: { date: '2026-10-26', sha: 'abc123' },
    channelId: 'default',
    priority: 'high',
    sound: 'default',
  });
});
test('1건이면 한 줄만 넣는다', () => assert.equal(buildPushMessage(brief([item('A')]), TOKEN, 's').body, '1. A'));
test('0건이면 없음 문구를 보낸다', () => {
  const msg = buildPushMessage(brief([]), TOKEN, 's');
  assert.equal(msg.title, 'AI 브리핑 10/26');
  assert.equal(msg.body, '오늘은 기준에 맞는 새 뉴스가 없다');
});
test('9시 KST부터 컷오프다', () => {
  assert.equal(isPastCutoff('2026-10-26T08:59:59+09:00'), false);
  assert.equal(isPastCutoff('2026-10-26T09:00:00+09:00'), true);
  assert.equal(isPastCutoff('2026-10-25T23:59:00Z'), false);
  assert.equal(isPastCutoff('2026-10-26T00:00:00Z'), true);
});
const msg = buildPushMessage(brief([item('A')]), TOKEN, 's');
const reply = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status });
test('ok ticket이면 id를 돌려준다', async () =>
  assert.equal(await sendPush(msg, reply({ data: [{ status: 'ok', id: 'ticket-1' }] })), 'ticket-1'));
test('error ticket이면 throw한다', async () =>
  assert.rejects(sendPush(msg, reply({ data: [{ status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } }] })), /DeviceNotRegistered/));
test('HTTP 오류면 throw한다', async () => assert.rejects(sendPush(msg, reply({ errors: [{ message: 'x' }] }, 500)), /500/));
```

- [ ] **Step 2: 실패를 확인한다**

Run: `pnpm test`
Expected: push 테스트가 `ERR_MODULE_NOT_FOUND`로 FAIL

- [ ] **Step 3: `push.mts`·`env.mts`·CLI를 구현한다**

HTTP 오류는 conventions의 `ApiError`(status를 담은 오류) 하나로 던진다. scripts는 `src/shared/api/ApiError.ts`를 import하지 않고(Task 7에서 생긴다) `push.mts` 안에서 같은 모양으로 던져도 된다. 다만 클래스 parameter property는 `erasableSyntaxOnly`에 걸리니 필드를 따로 선언한다.

- [ ] **Step 4: 통과를 확인한다**

Run: `pnpm test`
Expected: 전부 PASS

- [ ] **Step 5: 검사 후 커밋한다**

Run: `pnpm typecheck; pnpm lint; pnpm format:check`

```bash
git add scripts
git commit -m "feat: Top 2 푸시 발송 스크립트를 추가한다"
```

---

### Task 6: 예약 작업 지시문과 시험 생성

**Files:**
- Create: `prompts/daily-brief.md`, `briefs/<오늘 날짜>.json`

**Interfaces:**
- Consumes: `node scripts/context.mts`, `node scripts/validateBrief.mts <file>`, `node scripts/sendPush.mts <file>`, 브리핑 스키마(Task 3)

- [ ] **Step 1: 지시문을 쓴다**

`prompts/daily-brief.md`는 예약 작업 에이전트(Sonnet)가 위에서부터 그대로 따르는 문서다. 아래 순서와 내용을 담는다. 선별 기준은 설계 문서 "뉴스 선별 기준"을 빠짐없이 옮긴다.

1. `pnpm install --frozen-lockfile`(pnpm이 없으면 `corepack enable` 뒤 다시). 실패하면 멈춘다.
2. `node scripts/context.mts`를 실행해 JSON을 읽는다. `tradingDay`가 false면 아무것도 하지 않고 끝낸다. 오류로 끝나면 그대로 멈춘다.
3. 수집: 밤사이 미국 뉴스를 중심으로 `since` 이후 기사를 WebSearch로 모은다. 포함 범위 6가지(실적·가이던스, 제품·모델·칩 발표, 규제·소송·수출 통제, 반도체·데이터센터 공급망, M&A·투자·IPO, 사고)와 제외(연구 논문, SNS 화제성 데모·바이럴)를 적는다. watchlist 종목 이름으로도 한 번씩 검색한다.
4. 확인: 후보 기사마다 WebFetch로 원문을 열어 기사가 있는지, 제목과 발행 시각을 확인한다. 열리지 않거나 발행 시각을 확인하지 못한 기사는 버린다. 발행 시각이 `since` 이전이거나 url이 `previous.urls`에 있으면 버린다. 같은 사건을 다룬 기사는 하나만 남긴다.
5. 작성: 남은 기사로 `briefs/<date>.json`을 쓴다. 필드 설명과 예시 한 건을 지시문에 둔다: `generatedAt`은 2단계의 `now`, `summary`는 한국어 2~3문장, `source`는 매체 이름, 종목은 미국·한국 관련주를 함께 짚고 ticker 형식(KR 6자리, US 대문자), `verdict`·`strength`·`reason`(한 줄), `watch`는 watchlist 기준. 매매 행동 제안을 쓰지 않는다.
6. 순서와 건수: 보유 종목이 걸린 뉴스를 먼저, 그 안과 나머지는 시장 파급력 순. 최대 10건이고 억지로 채우지 않는다. 0건이면 `items: []`로 쓴다.
7. `node scripts/validateBrief.mts briefs/<date>.json`. 오류가 나면 그 줄을 고치거나 기사를 빼고 다시 돌린다. 세 번 고쳐도 안 되면 커밋하지 않고 멈춘다.
8. `git add briefs/<date>.json && git commit -m "chore: <date> 브리핑을 추가한다"`, `git push origin main`. 실패하면 `git pull --rebase` 뒤 한 번 더 push한다.
9. `node scripts/sendPush.mts briefs/<date>.json`. 9시 컷오프는 스크립트가 판단한다.
10. 마지막에 실행 요약(건수, 버린 후보 수와 이유, 소요 시간)을 출력한다.

지시문 맨 위에 "없는 뉴스를 지어내거나 확인하지 못한 기사를 넣는 것이 가장 큰 실패다"를 적는다.

- [ ] **Step 2: 이 세션에서 지시문대로 한 번 생성한다**

2단계를 `node scripts/context.mts --force`로 바꿔 1~8단계를 따른다(9단계 알림은 Task 8에서 시험한다). 생성 중에 지시문이 모호해 판단이 필요했던 곳은 지시문을 고친다.

Run: `node scripts/validateBrief.mts briefs/<date>.json`
Expected: `OK`

- [ ] **Step 3: 사실 대조를 받는다**

브리핑에서 3건을 골라 url을 열어 제목·발행 시각·요약이 원문과 맞는지 확인한다(opus 리뷰어에게 맡긴다). 어긋나면 지시문의 확인 단계를 고치고 Step 2를 다시 한다.

- [ ] **Step 4: 커밋하고 push한다**

```bash
git add prompts briefs
git commit -m "feat: 예약 작업 지시문과 첫 브리핑을 추가한다"
git push origin main
```

---

### Task 7: 앱 브리핑 화면

**Files:**
- Create: `src/shared/config/repo.ts`, `src/shared/config/copy.ts`, `src/shared/api/ApiError.ts`, `src/shared/api/queryKeys.ts`, `src/shared/ui/StateView.tsx`, `src/features/brief/apis/github.ts`, `src/features/brief/hooks/useHeadSha.ts`, `src/features/brief/hooks/useBriefDates.ts`, `src/features/brief/hooks/useBrief.ts`, `src/features/brief/index.ts`, `src/widgets/briefView/ui/BriefView.tsx`, `src/widgets/briefView/ui/NewsCard.tsx`, `src/widgets/briefView/index.ts`, `src/screens/{today,archive,brief}/index.ts`, `src/screens/today/ui/TodayScreen.tsx`, `src/screens/archive/ui/ArchiveScreen.tsx`, `src/screens/brief/ui/BriefScreen.tsx`, `src/_app/RootLayout.tsx`, `app/_layout.tsx`, `app/index.tsx`, `app/archive.tsx`, `app/brief/[date].tsx`

**Interfaces:**
- Consumes: `briefSchema`, `Brief`, `nowKst`, `toKst`
- Produces:
  - `repo.ts`: `GITHUB_OWNER = 'eeennsu'`, `GITHUB_REPO = 'ai-news-brief'`, `BRIEFS_PATH = 'briefs'`
  - `ApiError`: `class ApiError extends Error { status: number }`
  - `qk.brief.head()`, `qk.brief.dates(sha: string)`, `qk.brief.detail(sha: string, date: string)`
  - `fetchHeadSha(): Promise<string>` — `GET https://api.github.com/repos/{owner}/{repo}/commits/main`, `Accept: application/vnd.github.sha`, 응답 본문(trim)이 40자 hex인지 확인
  - `fetchBriefDates(sha: string): Promise<string[]>` — `GET https://api.github.com/repos/{owner}/{repo}/contents/briefs?ref={sha}`, 응답을 `{ name: string }[]`로 파싱해 `YYYY-MM-DD.json`만 날짜로 바꿔 최신순
  - `fetchBrief(sha: string, date: string): Promise<Brief | null>` — `GET https://raw.githubusercontent.com/{owner}/{repo}/{sha}/briefs/{date}.json`, 404면 null, `briefSchema`로 파싱
  - 훅: `useHeadSha(hint?: string): { sha: string | undefined; query }` (hint가 있으면 요청하지 않는다), `useBriefDates(sha: string | undefined)`, `useBrief(sha: string | undefined, date: string)`
  - 라우트: `/`(오늘), `/archive`(날짜 목록), `/brief/[date]?sha=`(그날 브리핑). Task 8이 알림 탭을 `/brief/[date]?sha=`로 보낸다.

GitHub API 출처(확인일 2026-10-25): https://docs.github.com/en/rest/commits/commits#get-a-commit (`application/vnd.github.sha`는 SHA만 돌려준다), https://docs.github.com/en/rest/repos/contents#get-repository-content (디렉터리는 항목 배열, 1,000개 상한). 비인증 요청 한도는 시간당 60회로 알려져 있으나 이 문서들에서 확인하지 못했다. 앱을 한 번 열 때 2~3회 쓴다.

캐시: SHA로 고정한 요청은 내용이 바뀌지 않으므로 `qk.brief.dates`·`qk.brief.detail`은 staleTime·gcTime `Infinity`, `qk.brief.head`는 staleTime `30_000`, gcTime `300_000`. 쿼리 재시도는 429·5xx에서만 1회.

화면:
- 오늘(`/`): `date = nowKst().format('YYYY-MM-DD')`, head SHA로 오늘 브리핑을 읽는다. 없으면(null) `오늘 브리핑 없음`과 `가장 최근 브리핑 보기` 버튼(최신 날짜의 `/brief/[date]?sha=`로 이동, 날짜가 하나도 없으면 버튼을 숨긴다). 상단에 `지난 브리핑` 링크(`/archive`). 당겨서 새로고침은 head를 다시 읽는다.
- 지난 브리핑(`/archive`): 날짜 목록, 누르면 `/brief/[date]?sha=<목록을 읽은 SHA>`.
- 그날 브리핑(`/brief/[date]`): `date` param을 `z.iso.date()`로 검증, `sha` param이 있으면 그것으로, 없으면 head로 읽는다.
- `BriefView({ brief }: Props)`: 0건이면 `오늘은 기준에 맞는 새 뉴스가 없다`. 뉴스 카드는 제목, `source · MM/DD HH:mm`(KST), 요약, 종목 줄(`이름(ticker)`, 판정 라벨 호재·악재·중립, 강도 약·중·강, 근거). `watch`가 있는 종목은 `보유`·`관심` 배지와 배경색으로 강조한다. `원문 보기`는 `Linking.openURL(url)`로 외부 브라우저에서 연다.
- 세 화면 모두 로딩(스켈레톤)·에러(`브리핑을 불러오지 못했다` + `다시 시도`)·빈 상태를 `StateView`로 그린다. 문구는 전부 `copy.ts`에 둔다.
- 라우트 파일은 재수출만 한다: `export { TodayScreen as default } from '@screens/today'`, `app/_layout.tsx`는 `export { RootLayout as default } from '@app/RootLayout'`.

- [ ] **Step 1: 데이터 계층을 만든다**

`repo.ts`·`ApiError.ts`·`queryKeys.ts`·`github.ts`·훅과 `@tanstack/react-query` 설치(`pnpm add`), `RootLayout`의 `QueryClientProvider`·`Stack`.

Run: `pnpm typecheck`
Expected: 종료 코드 0

- [ ] **Step 2: 위젯·화면·라우트를 만든다**

위 화면 명세대로 만든다. 화면 디자인은 `mobile-taste-skill` 계열 스킬을 따른다.

- [ ] **Step 3: 에뮬레이터에서 확인한다**

`pnpm expo start` 후 Android 에뮬레이터의 Expo Go로 연다(`argent-device-interact`). 확인할 것:
- `/archive`에 Task 6 브리핑 날짜가 보이고, 누르면 그날 브리핑이 보인다
- 보유·관심 배지가 보인다(`config/watchlist.json`이 비어 있으면 Task 6 브리핑에 배지가 없는 게 맞다. 이때는 확인을 Task 9 실브리핑으로 넘기고 그렇게 보고한다)
- `원문 보기`가 외부 브라우저를 연다
- 오늘 브리핑이 없는 날이면 `오늘 브리핑 없음`과 `가장 최근 브리핑 보기`가 보이고, 버튼이 최신 브리핑으로 간다
- 비행기 모드에서 에러 상태와 `다시 시도`가 보인다

각 화면 스크린샷을 보고에 붙인다.

- [ ] **Step 4: 검사 후 커밋한다**

Run: `pnpm typecheck; pnpm lint; pnpm format:check; pnpm test`
Expected: 종료 코드 0

```bash
git add src app package.json pnpm-lock.yaml
git commit -m "feat: 오늘·지난 브리핑 화면을 추가한다"
```

---

### Task 8: 푸시 수신과 APK 빌드

**Files:**
- Create: `src/shared/lib/notifications.ts`, `src/features/pushToken/ui/PushTokenPanel.tsx`, `src/features/pushToken/index.ts`, `eas.json`, `app.config.ts`
- Delete: `app.json`(내용은 `app.config.ts`로 옮긴다)
- Modify: `src/_app/RootLayout.tsx`, `src/screens/archive/ui/ArchiveScreen.tsx`, `src/shared/config/copy.ts`, `.gitignore`

**Interfaces:**
- Consumes: 라우트 `/brief/[date]?sha=`(Task 7), 채널 ID `'default'`(Task 5 `NOTIFICATION_CHANNEL_ID`. 앱은 scripts를 import하지 않으니 `notifications.ts`에 같은 값을 둔다)
- Produces:
  - `registerForPushToken(): Promise<string>` — Android 채널 `default`(importance MAX) 생성, 권한 요청, `getExpoPushTokenAsync({ projectId })`. 권한이 거부되면 throw
  - `useNotificationTarget(): { date: string; sha: string } | null` — `Notifications.useLastNotificationResponse()`의 `data`를 zod로 파싱

Expo 사실(확인일 2026-10-25): projectId는 `Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId`, 채널 생성은 `Notifications.setNotificationChannelAsync('default', { name: 'default', importance: Notifications.AndroidImportance.MAX })`(https://docs.expo.dev/push-notifications/push-notifications-setup/). 메시지의 `channelId` 채널이 기기에 없으면 알림이 표시되지 않는다(https://docs.expo.dev/push-notifications/sending-notifications/). SDK 58부터 포그라운드 알림이 기본으로 표시된다(https://expo.dev/changelog/sdk-58). APK는 빌드 프로필의 `android.buildType: "apk"`(https://docs.expo.dev/build-reference/apk/).

- [ ] **Step 1: 사용자에게 계정 작업을 안내한다**

사용자만 할 수 있는 일이다. 순서대로 안내하고 끝났다는 답을 기다린다.
1. `pnpm dlx eas-cli login`, 이어서 레포에서 `pnpm dlx eas-cli init`(projectId를 받는다)
2. Firebase 콘솔에서 프로젝트를 만들고 Android 앱(패키지 `dev.eeennsu.ainewsbrief`)을 등록해 `google-services.json`을 받는다. 레포 루트에 두되 커밋하지 않는다
3. FCM V1 서비스 계정 키를 EAS에 올린다(https://docs.expo.dev/push-notifications/fcm-credentials/, `eas credentials` → Android → FCM V1)
4. `google-services.json`을 EAS의 file 타입 환경 변수 `GOOGLE_SERVICES_JSON`(preview 환경, 공개 범위 secret)으로 올린다. 명령은 `pnpm dlx eas-cli env:create --help`로 확인한다

- [ ] **Step 2: 앱 설정을 만든다**

`app.config.ts`(default export): 기존 `app.json` 내용, `android.package: 'dev.eeennsu.ainewsbrief'`, `android.googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json'`, plugins에 `expo-router`·`expo-notifications`, `extra.eas.projectId`(Step 1에서 받은 값. 공개돼도 되는 값이다). `.gitignore`에 `google-services.json`. `eas.json`:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "environment": "preview",
      "android": { "buildType": "apk" }
    }
  }
}
```

- [ ] **Step 3: 알림 코드를 만든다**

`npx expo install expo-notifications`. `notifications.ts`, `PushTokenPanel`(지난 브리핑 화면 아래. `푸시 토큰 보기` 버튼 → 토큰을 `selectable` Text로 표시, 실패 문구는 `알림 권한이 없어 토큰을 받지 못했다. 설정에서 알림을 켠 뒤 다시 누른다`), `RootLayout`에서 `useNotificationTarget()`이 바뀌면 `router.push({ pathname: '/brief/[date]', params: target })`. 같은 응답으로 두 번 이동하지 않게 effect 의존성은 알림 identifier로 한다.

Run: `pnpm typecheck; pnpm lint; pnpm format:check`
Expected: 종료 코드 0

- [ ] **Step 4: 커밋하고 APK를 빌드한다**

```bash
git add -A
git commit -m "feat: 푸시 알림 수신과 APK 빌드 설정을 추가한다"
git push origin main
```

conventions rn.md대로 실기기 빌드는 커밋된 상태에서 한다. Run: `pnpm dlx eas-cli build -p android --profile preview`
Expected: 빌드가 끝나고 APK 다운로드 URL이 나온다. 사용자가 갤럭시에 설치한다.

- [ ] **Step 5: 실기기로 끝까지 시험한다**

사용자가 앱의 `푸시 토큰 보기`로 토큰을 받아 전달하면, 그 값을 이 셸에만 넣고 보낸다(파일에 적지 않는다).

Run: `EXPO_PUSH_TOKEN='<토큰>' node scripts/sendPush.mts briefs/<Task 6 날짜>.json --ignore-cutoff` (PowerShell은 `$env:EXPO_PUSH_TOKEN='<토큰>'; node scripts/sendPush.mts ...`)
Expected: ticket id 출력. 사용자에게 확인받는다: 알림 제목·Top 2 본문이 보이고, 누르면 그날 브리핑 화면이 열리며, 앱이 꺼진 상태에서 눌러도 같다.

---

### Task 9: 예약 작업 등록과 첫 실행

**Files:**
- Create: `README.md`
- Modify: `docs/routine-check.md`

- [ ] **Step 1: 사용자가 클라우드 환경의 토큰을 진짜로 바꾼다**

Task 1의 환경 변수 `EXPO_PUSH_TOKEN`을 Task 8에서 받은 토큰으로 바꾸도록 안내한다.

- [ ] **Step 2: 예약 작업을 만든다**

`schedule` 스킬로 만든다. 이름 `ai-news-brief`, 레포 `eeennsu/ai-news-brief`, 모델 Sonnet, Task 1의 환경. 프롬프트는 `레포의 prompts/daily-brief.md를 읽고 그대로 따른다.` 한 줄이다. 일정은 평일 7:37 KST이고, Task 1에서 확인한 타임존 기준으로 적는다(UTC면 `37 22 * * 0-4`, 요일 지정이 안 되면 매일 `37 22 * * *`. 주말은 `context.mts`가 거른다).

- [ ] **Step 3: 첫 실행을 확인한다**

평일 아침에 예약대로 돈 첫 실행을 본다(급하면 평일 9:00 전에 Run now). 확인할 것: main에 브리핑 커밋, 폰 알림, 앱에서 바로 그날 브리핑이 보임, 시작부터 알림까지 걸린 시간. 걸린 시간 때문에 8:15 도착이 어렵다면 시작 시각을 당길지 사용자에게 묻는다. 결과와 확인일을 `docs/routine-check.md`에 덧붙인다.

- [ ] **Step 4: README를 쓴다**

한국어 '-다'체로 쓴다. 담을 것: 무엇을 하는지, 구조(예약 작업 → scripts → briefs → 앱), 보유·관심 종목 고치는 법(`config/watchlist.json`을 Claude Code로), 선별 기준 고치는 법(`prompts/daily-brief.md`), 휴장일 목록 연 1회 갱신(12월, `data/krx-holidays.json`의 `years`), 알림이 안 온 날 확인할 곳(예약 작업 실행 기록), 앱 다시 빌드하는 법, 비밀값이 어디 있는지. 다 쓰면 `korean-humanizer`로 다듬는다.

- [ ] **Step 5: 커밋한다**

```bash
git add README.md docs/routine-check.md
git commit -m "docs: README와 첫 실행 결과를 추가한다"
git push origin main
```
