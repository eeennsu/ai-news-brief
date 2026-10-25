import { basename } from 'node:path';
import { ZodError } from 'zod';

import { briefSchema } from '../src/entities/brief/contracts.ts';
import { nowKst } from '../src/shared/lib/dayjs.ts';
import { checkBrief } from './lib/checkBrief.mts';
import { findPreviousDate } from './lib/context.mts';
import { BRIEFS_DIR, listBriefNames, readJson } from './lib/files.mts';
import { watchlistSchema } from './lib/schemas.mts';

const fail = (lines: string[]): never => {
  process.stdout.write(`${lines.join('\n')}\n`);
  process.exit(1);
};

const formatPath = (path: PropertyKey[]): string =>
  path.reduce<string>(
    (acc, key) =>
      typeof key === 'number' ? `${acc}[${key}]` : acc ? `${acc}.${String(key)}` : String(key),
    '',
  );

const path = process.argv[2];
if (!path) fail(['사용법: node scripts/validateBrief.mts briefs/<date>.json']);

const brief = (() => {
  try {
    return readJson(path ?? '', briefSchema);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail(error.issues.map((issue) => `${formatPath(issue.path)}: ${issue.message}`));
    }
    return fail([`${path}: ${error instanceof Error ? error.message : String(error)}`]);
  }
})();

const previousDate = findPreviousDate(listBriefNames(), brief.date);
const previousPath = `${BRIEFS_DIR}/${previousDate}.json`;
const previous = (() => {
  if (!previousDate) return null;
  try {
    return readJson(previousPath, briefSchema);
  } catch (error) {
    // 깨진 직전 브리핑을 건너뛰면 since·중복 검사가 조용히 꺼진다.
    return fail([
      `${previousPath}: 직전 브리핑을 읽지 못했다 (${error instanceof Error ? error.message : String(error)})`,
    ]);
  }
})();

const watchlist = readJson('config/watchlist.json', watchlistSchema);

const errors = checkBrief(brief, { previous, watchlist, now: nowKst().format() });
if (basename(path ?? '') !== `${brief.date}.json`) {
  errors.unshift(`date: 파일 이름(${basename(path ?? '')})과 date(${brief.date})가 다르다`);
}

if (errors.length > 0) fail(errors);
process.stdout.write('OK\n');
