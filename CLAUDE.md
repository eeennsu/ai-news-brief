@~/my-agent-setup/docs/rn.md

코드 컨벤션은 conventions 스킬을 따른다.

## scripts 규칙

- scripts는 `.mts`로 쓰고 상대경로 import에 확장자를 붙인다(`./foo.ts`).
- scripts가 import하는 `src` 파일은 패키지만 import한다. `@shared/*` 같은 alias는 node가 풀지 못한다.
- dayjs 플러그인은 `dayjs/plugin/utc.js`처럼 `.js`까지 적는다.

## 설정

보유·관심 종목은 `config/watchlist.json`, 선별 기준은 `prompts/daily-brief.md`를 고친다.
