import { z } from 'zod';

import { briefSchema, type Brief } from '@entities/brief';

import { ApiError } from '@shared/api/ApiError';
import { BRIEFS_PATH, GITHUB_OWNER, GITHUB_REPO, SHA_PATTERN } from '@shared/config/repo';

const API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
const BRIEF_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.json$/;

const contentsSchema = z.array(z.object({ name: z.string() }));

const assertOk = (res: Response) => {
  if (!res.ok) throw new ApiError(res.status, `GitHub 요청 실패 (${res.status}): ${res.url}`);
};

export const fetchHeadSha = async (): Promise<string> => {
  const res = await fetch(`${API_BASE}/commits/main`, {
    headers: { Accept: 'application/vnd.github.sha' },
  });
  assertOk(res);
  const sha = (await res.text()).trim();
  if (!SHA_PATTERN.test(sha)) throw new ApiError(res.status, 'HEAD SHA 형식이 올바르지 않다');
  return sha;
};

// shortcut: contents API는 디렉터리 항목을 1,000개까지만 준다, 브리핑이 1,000일을 넘으면 연도별 폴더로 나눈다.
export const fetchBriefDates = async (sha: string): Promise<string[]> => {
  const res = await fetch(`${API_BASE}/contents/${BRIEFS_PATH}?ref=${sha}`);
  assertOk(res);
  const entries = contentsSchema.parse(await res.json());
  return entries
    .flatMap(({ name }) => BRIEF_FILE_PATTERN.exec(name)?.[1] ?? [])
    .sort()
    .reverse();
};

export const fetchBrief = async (sha: string, date: string): Promise<Brief | null> => {
  const res = await fetch(`${RAW_BASE}/${sha}/${BRIEFS_PATH}/${date}.json`);
  if (res.status === 404) return null;
  assertOk(res);
  return briefSchema.parse(await res.json());
};
