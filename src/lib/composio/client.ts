import { Composio } from '@composio/core';
import { supabaseService } from '@/lib/supabase/server';

let cached: Composio | null = null;

async function userIdForConnection(connectedAccountId: string): Promise<string> {
  const { data, error } = await supabaseService()
    .from('connections')
    .select('session_id')
    .eq('composio_conn_id', connectedAccountId)
    .maybeSingle();
  if (error || !data?.session_id) {
    throw new Error(`No connection row for composio_conn_id=${connectedAccountId}`);
  }
  return data.session_id as string;
}

export function getComposio(): Composio {
  if (cached) return cached;
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) throw new Error('COMPOSIO_API_KEY not set');
  cached = new Composio({ apiKey });
  return cached;
}

/**
 * Start a GitHub OAuth flow. In @composio/core 0.4.x the signature is
 * connectedAccounts.initiate(userId, authConfigId, { callbackUrl }), and the
 * returned ConnectionRequest exposes { id, redirectUrl, status }.
 */
export async function initiateGithubAuth(params: {
  userId: string;
  redirectUri: string;
}): Promise<{ redirectUrl: string; connectionId: string }> {
  const composio = getComposio();
  const authConfigId = process.env.COMPOSIO_GITHUB_INTEGRATION_ID;
  if (!authConfigId) throw new Error('COMPOSIO_GITHUB_INTEGRATION_ID not set');
  const conn = await composio.connectedAccounts.initiate(params.userId, authConfigId, {
    callbackUrl: params.redirectUri,
  });
  if (!conn.redirectUrl) {
    throw new Error('Composio did not return a redirectUrl for GitHub OAuth');
  }
  return { redirectUrl: conn.redirectUrl, connectionId: conn.id };
}

/**
 * Fetch a connected account. The v0.4 response does not carry a reliable
 * github login, so we best-effort probe well-known fields on state/data/params
 * and return null when nothing is found; the OAuth callback will typically
 * populate the login by calling the GitHub "user" action afterwards.
 */
export async function getGithubConnection(connectionId: string): Promise<{
  id: string;
  status: string;
  githubLogin: string | null;
}> {
  const composio = getComposio();
  const conn = await composio.connectedAccounts.get(connectionId);
  const bags: Array<Record<string, unknown> | undefined> = [
    conn.state as unknown as Record<string, unknown> | undefined,
    conn.data,
    conn.params,
  ];
  let login: string | null = null;
  for (const bag of bags) {
    if (!bag) continue;
    const candidate =
      (bag as { login?: unknown }).login ??
      (bag as { account_id?: unknown }).account_id ??
      (bag as { username?: unknown }).username;
    if (typeof candidate === 'string' && candidate.length > 0) {
      login = candidate;
      break;
    }
  }
  return { id: conn.id, status: String(conn.status), githubLogin: login };
}

/**
 * Execute a Composio tool. The public contract here stays { action, connectedAccountId,
 * params? } -> { data } to keep the engine-facing shape unchanged, but under the hood
 * v0.4 wants tools.execute(slug, { connectedAccountId, arguments }).
 */
export async function composioExecute(args: {
  action: string;
  connectedAccountId: string;
  params?: Record<string, unknown>;
  userId?: string; // optional override; otherwise looked up from the connections row
}): Promise<{ data: unknown }> {
  const composio = getComposio();
  const userId = args.userId ?? (await userIdForConnection(args.connectedAccountId));
  const res = await composio.tools.execute(args.action, {
    connectedAccountId: args.connectedAccountId,
    userId,
    arguments: args.params ?? {},
    // Composio v0.4 requires either a pinned toolkit version or this flag for
    // manual execution. We accept the "may break on upgrades" trade-off.
    dangerouslySkipVersionCheck: true,
  });
  if (res.error) {
    throw new Error(`Composio action ${args.action} failed: ${res.error}`);
  }
  return { data: res.data };
}

export async function listUserRepos(connectedAccountId: string): Promise<Array<{ full_name: string; private: boolean }>> {
  // Composio v0.4's GitHub toolkit has no action that matches the GitHub REST
  // GET /user/repos. `GITHUB_FIND_REPOSITORIES` is search-indexed and misses
  // recent/private repos. Workaround: Composio's proxy-execute forwards to
  // the raw GitHub API using the connection's OAuth token.
  try {
    const composio = getComposio();
    const res = (await composio.tools.proxyExecute({
      endpoint: '/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator',
      method: 'GET',
      connectedAccountId,
      parameters: [],
    })) as { data?: Array<{ full_name?: string; private?: boolean }>; status?: number };
    if (!Array.isArray(res.data)) return [];
    return res.data
      .map(r => ({
        full_name: r.full_name ?? '',
        private: Boolean(r.private),
      }))
      .filter(r => r.full_name.length > 0);
  } catch (err) {
    console.error('[composio] listUserRepos proxyExecute failed', err);
    return [];
  }
}
