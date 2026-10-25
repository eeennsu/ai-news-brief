import { readdirSync, readFileSync } from 'node:fs';
import type { z } from 'zod';

export const BRIEFS_DIR = 'briefs';

export const readJson = <T,>(path: string, schema: z.ZodType<T>): T =>
  schema.parse(JSON.parse(readFileSync(path, 'utf8')));

export const listBriefNames = (dir: string = BRIEFS_DIR): string[] => readdirSync(dir);
