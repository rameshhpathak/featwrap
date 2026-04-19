import { NextResponse } from 'next/server';
import { getJobWithDigests } from '@/lib/supabase/jobs';
import { signedUrl } from '@/lib/supabase/storage';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getJobWithDigests(id);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const digestsWithUrls = await Promise.all(row.digests.map(async d => ({
    audience: d.audience,
    script: d.script,
    prNumbers: d.pr_numbers,
    audioUrl: d.audio_path ? await signedUrl(d.audio_path) : null,
  })));
  return NextResponse.json({
    id: row.job.id,
    status: row.job.status,
    step: row.job.step,
    progress: row.job.progress,
    error: row.job.error,
    createdAt: row.job.created_at,
    completedAt: row.job.completed_at,
    digests: digestsWithUrls,
  });
}
