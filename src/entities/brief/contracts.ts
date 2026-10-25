import { z } from 'zod';

export const MARKETS = { US: 'US', KR: 'KR' } as const;
export const VERDICTS = { positive: 'positive', negative: 'negative', neutral: 'neutral' } as const;
export const STRENGTHS = { weak: 'weak', medium: 'medium', strong: 'strong' } as const;
export const WATCH = { holding: 'holding', interest: 'interest' } as const;
export const BRIEF_MAX_ITEMS = 10;

const TICKER_PATTERNS = {
  [MARKETS.KR]: /^\d{6}$/,
  [MARKETS.US]: /^[A-Z]{1,5}(\.[A-Z])?$/,
};

const nonEmpty = z.string().min(1);

const stockRefShape = {
  market: z.enum(MARKETS),
  ticker: nonEmpty,
  name: nonEmpty,
};

const isTickerValid = (stock: { market: keyof typeof TICKER_PATTERNS; ticker: string }) =>
  TICKER_PATTERNS[stock.market].test(stock.ticker);
const TICKER_ERROR = {
  path: ['ticker'],
  message: 'ticker 형식이 market과 맞지 않는다 (KR 6자리 숫자, US 대문자 1~5자)',
};

export const stockRefSchema = z.object(stockRefShape).refine(isTickerValid, TICKER_ERROR);

export const stockSchema = z
  .object({
    ...stockRefShape,
    verdict: z.enum(VERDICTS),
    strength: z.enum(STRENGTHS),
    reason: nonEmpty,
    watch: z.enum(WATCH).nullable(),
  })
  .refine(isTickerValid, TICKER_ERROR);

export const newsItemSchema = z.object({
  title: nonEmpty,
  summary: nonEmpty,
  source: nonEmpty,
  url: z.url({ protocol: /^https$/ }),
  publishedAt: z.iso.datetime({ offset: true }),
  stocks: z.array(stockSchema).min(1),
});

export const briefSchema = z.object({
  date: z.iso.date(),
  generatedAt: z.iso.datetime({ offset: true }),
  items: z.array(newsItemSchema).max(BRIEF_MAX_ITEMS),
});
