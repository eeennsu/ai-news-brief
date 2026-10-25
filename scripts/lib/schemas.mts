import { z } from 'zod';

import { stockRefSchema } from '../../src/entities/brief/contracts.ts';

export const watchlistSchema = z.object({
  holdings: z.array(stockRefSchema),
  interests: z.array(stockRefSchema),
});

export const holidaysSchema = z.object({
  source: z.url(),
  checkedAt: z.iso.date(),
  years: z.array(z.number().int()),
  dates: z.array(z.iso.date()),
});

export type Watchlist = z.infer<typeof watchlistSchema>;
export type Holidays = z.infer<typeof holidaysSchema>;
