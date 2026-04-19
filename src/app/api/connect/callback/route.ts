import { NextRequest, NextResponse } from 'next/server';
import { ensureSession } from '@/lib/session';
import { getGithubConnection, composioExecute } from '@/lib/composio/client';
import { supabaseService } from '@/lib/supabase/server';

export const runtime = 'nodejs';

async function fetchGithubLogin(connectedAccountId: string): Promise<string | null> {
  try {
    const res = await composioExecute({
      action: 'GITHUB_USERS_GET_AUTHENTICATED',
      connectedAccountId,
    });
    const data = res.data as { login?: string } | null;
    return data?.login ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const sid = await ensureSession();
  const url = new URL(req.url);
  const connId =
    url.searchParams.get('connectedAccountId') ??
    url.searchParams.get('connId') ??
    url.searchParams.get('connection_id') ??
    url.searchParams.get('connectionId') ??
    req.cookies.get('featwrap_pending_conn')?.value ??
    null;
  if (!connId) {
    return NextResponse.redirect(new URL('/?error=missing_connection', req.url));
  }

  try {
    const conn = await getGithubConnection(connId);
    const githubLogin = conn.githubLogin ?? (await fetchGithubLogin(connId));

    await supabaseService()
      .from('connections')
      .upsert(
        {
          session_id: sid,
          provider: 'github',
          composio_conn_id: connId,
          github_login: githubLogin,
        },
        { onConflict: 'session_id,provider' },
      );
  } catch (err) {
    console.error('[callback] failed to finalize connection', err);
    return NextResponse.redirect(new URL('/?error=finalize_failed', req.url));
  }

  const res = NextResponse.redirect(new URL('/generate', req.url));
  res.cookies.delete('featwrap_pending_conn');
  return res;
}
