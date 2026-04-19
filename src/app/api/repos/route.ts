import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getConnectionIdBySession } from '@/lib/supabase/jobs';
import { listUserRepos } from '@/lib/composio/client';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session.sid) return NextResponse.json({ repos: [] }, { status: 401 });
  const conn = await getConnectionIdBySession(session.sid);
  if (!conn) return NextResponse.json({ repos: [] }, { status: 401 });
  try {
    const repos = await listUserRepos(conn.composio_conn_id);
    return NextResponse.json({ repos: repos.map(r => ({ fullName: r.full_name, private: r.private })) });
  } catch (err) {
    console.error('[api/repos] failed', err);
    return NextResponse.json({ repos: [], error: 'repo_list_failed' }, { status: 500 });
  }
}
