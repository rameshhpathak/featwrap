import type { PullRequest } from '../types';

/**
 * Minimal shape returned by Composio's GitHub list-PRs tool.
 * We treat Composio's `executeAction` as an injected function so tests
 * can replace it with a mock.
 */
export type ComposioExecute = (params: {
  action: string;
  connectedAccountId: string;
  params?: Record<string, unknown>;
}) => Promise<{ data: unknown }>;

interface RawPR {
  number: number;
  title: string;
  body: string | null;
  user: { login: string };
  merged_at: string | null;
  state: string;
  head: { sha: string };
}

const DURATION_RE = /^(\d+)([dh])$/;

export function parseSinceDuration(since: string): number {
  const m = DURATION_RE.exec(since);
  if (!m) throw new Error(`Invalid --since value: ${since}`);
  const n = parseInt(m[1], 10);
  const unit = m[2];
  const ms = unit === 'd' ? 86_400_000 : 3_600_000;
  return n * ms;
}

export async function listMergedPRs(
  repo: string,
  since: string,
  executeAction: ComposioExecute,
  connectedAccountId: string,
  now: Date = new Date(),
): Promise<PullRequest[]> {
  const windowMs = parseSinceDuration(since);
  const cutoff = new Date(now.getTime() - windowMs);
  const [owner, name] = repo.split('/');
  if (!owner || !name) throw new Error(`Invalid repo: ${repo}`);

  const res = await executeAction({
    action: 'GITHUB_LIST_PULL_REQUESTS',
    connectedAccountId,
    params: { owner, repo: name, state: 'closed', sort: 'updated', direction: 'desc', per_page: 100 },
  });

  // Composio v0.4's GITHUB_LIST_PULL_REQUESTS returns { pull_requests: [...] }.
  // Defend against the raw array form + common wrapper field names too.
  const payload = res.data as unknown;
  const raw: RawPR[] = Array.isArray(payload)
    ? (payload as RawPR[])
    : ((payload as { pull_requests?: RawPR[] } | null)?.pull_requests
        ?? (payload as { items?: RawPR[] } | null)?.items
        ?? (payload as { data?: RawPR[] } | null)?.data
        ?? []);
  return raw
    .filter(p => p.merged_at !== null)
    .filter(p => new Date(p.merged_at as string) >= cutoff)
    .map<PullRequest>(p => ({
      number: p.number,
      title: p.title,
      body: p.body ?? '',
      author: p.user.login,
      mergedAt: p.merged_at as string,
      headSha: p.head.sha,
      diff: '', // filled by getPRDiff() when the classifier wants it
    }));
}

export async function getPRDiff(
  repo: string,
  prNumber: number,
  executeAction: ComposioExecute,
  connectedAccountId: string,
): Promise<string> {
  const [owner, name] = repo.split('/');
  const res = await executeAction({
    action: 'GITHUB_GET_A_PULL_REQUEST',
    connectedAccountId,
    params: { owner, repo: name, pull_number: prNumber },
  });
  const data = res.data as unknown;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object' && 'diff' in (data as Record<string, unknown>)) {
    return String((data as Record<string, unknown>).diff);
  }
  return '';
}
