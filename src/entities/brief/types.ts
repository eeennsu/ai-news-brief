import type { z } from 'zod';

import type {
  briefSchema,
  MARKETS,
  newsItemSchema,
  stockSchema,
  STRENGTHS,
  VERDICTS,
  WATCH,
} from './contracts.ts';

export type Brief = z.infer<typeof briefSchema>;
export type NewsItem = z.infer<typeof newsItemSchema>;
export type Stock = z.infer<typeof stockSchema>;
export type Market = (typeof MARKETS)[keyof typeof MARKETS];
export type Verdict = (typeof VERDICTS)[keyof typeof VERDICTS];
export type Strength = (typeof STRENGTHS)[keyof typeof STRENGTHS];
export type Watch = (typeof WATCH)[keyof typeof WATCH];
