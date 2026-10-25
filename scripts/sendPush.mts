import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

import { briefSchema } from '../src/entities/brief/contracts.ts';
import { nowKst } from '../src/shared/lib/dayjs.ts';
import { getPushToken } from './lib/env.mts';
import { readJson } from './lib/files.mts';
import { buildPushMessage, isPastCutoff, sendPush } from './lib/push.mts';

const fail = (message: string): never => {
  process.stdout.write(`${message}\n`);
  process.exit(1);
};

const git = (...args: string[]): string =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

const path = process.argv[2];
if (!path || path.startsWith('--')) {
  fail('사용법: node scripts/sendPush.mts briefs/<date>.json [--ignore-cutoff]');
}

const brief = (() => {
  try {
    return readJson(path ?? '', briefSchema);
  } catch (error) {
    return fail(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
})();

if (!process.argv.includes('--ignore-cutoff') && isPastCutoff(nowKst().format())) {
  process.stdout.write('9:00 KST가 지나 알림을 보내지 않는다\n');
  process.exit(0);
}

// 방금 push했으므로 fetch 없이 로컬 origin/main을 믿는다. 앱은 이 SHA의 raw URL에서 파일을 받는다.
const remoteFile = `briefs/${basename(path ?? '')}`;
try {
  git('cat-file', '-e', `origin/main:${remoteFile}`);
} catch {
  fail('origin/main에 브리핑이 없다. push를 확인한다');
}
const sha = git('rev-parse', 'origin/main');

try {
  const ticketId = await sendPush(buildPushMessage(brief, getPushToken(), sha));
  process.stdout.write(`ticket: ${ticketId}\n`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
