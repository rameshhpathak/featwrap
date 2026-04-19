import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { after } from 'next/server';
import { getSession } from '@/lib/session';
import { getConnectionIdBySession, createJob } from '@/lib/supabase/jobs';
import { runPipeline } from '@/lib/core/pipeline';
import { liveDeps } from '@/lib/core/deps';

export const runtime = 'nodejs';
export const maxDuration = 300;

const Body = z.object({
  repo: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
  since: z.string().regex(/^\d+[dh]$/),
  audience: z.enum(['marketing', 'sales', 'cs', 'dev', 'all']),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.sid) return NextResponse.json({ error: 'not_connected' }, { status: 401 });
  const conn = await getConnectionIdBySession(session.sid);
  if (!conn) return NextResponse.json({ error: 'not_connected' }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const jobId = await createJob({
    connectionId: conn.id,
    repo: body.repo,
    since: body.since,
    audience: body.audience,
  });

  after(async () => {
    try {
      await runPipeline(
        { jobId, repo: body.repo, since: body.since, audience: body.audience, composioConnId: conn.composio_conn_id, connectionId: conn.id },
        liveDeps(),
      );
    } catch (err) {
      console.error('[pipeline] uncaught', err);
    }
  });

  return NextResponse.json({ jobId });
}
