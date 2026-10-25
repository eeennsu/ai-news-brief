import { briefSchema } from '../src/entities/brief/contracts.ts';
import { nowKst } from '../src/shared/lib/dayjs.ts';
import { findPreviousDate, getSince, getTradingDay } from './lib/context.mts';
import { BRIEFS_DIR, listBriefNames, readJson } from './lib/files.mts';
import { holidaysSchema, watchlistSchema } from './lib/schemas.mts';

const force = process.argv.includes('--force');

const now = nowKst();
const date = now.format('YYYY-MM-DD');

const holidays = readJson('data/krx-holidays.json', holidaysSchema);
const watchlist = readJson('config/watchlist.json', watchlistSchema);

const previousDate = findPreviousDate(listBriefNames(), date);
const previousBrief = previousDate
  ? readJson(`${BRIEFS_DIR}/${previousDate}.json`, briefSchema)
  : null;

const trading = force ? { tradingDay: true as const } : getTradingDay(date, holidays);

const context = {
  now: now.format(),
  date,
  ...trading,
  since: getSince(previousBrief?.generatedAt ?? null, now.format()),
  previous: previousBrief && {
    date: previousBrief.date,
    generatedAt: previousBrief.generatedAt,
    urls: previousBrief.items.map((item) => item.url),
  },
  watchlist,
};

process.stdout.write(`${JSON.stringify(context, null, 2)}\n`);
