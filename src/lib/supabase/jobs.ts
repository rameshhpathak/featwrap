import { supabaseService } from './server';
import type { Audience, AudienceRequest } from '../core/types';

export async function createJob(args: {
  connectionId: string;
  repo: string;
  since: string;
  audience: AudienceRequest;
}): Promise<string> {
  const { data, error } = await supabaseService()
    .from('jobs')
    .insert({
      connection_id: args.connectionId,
      repo: args.repo,
      since: args.since,
      audience: args.audience,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateJob(jobId: string, update: {
  step?: string; progress?: number; status?: string; error?: string; completed_at?: string;
}): Promise<void> {
  const { error } = await supabaseService().from('jobs').update(update).eq('id', jobId);
  if (error) throw error;
}

export async function insertDigest(row: {
  job_id: string; audience: Audience; script: string; audio_path: string; pr_numbers: number[];
}): Promise<void> {
  const { error } = await supabaseService().from('digests').insert(row);
  if (error) throw error;
}

export interface JobRow {
  id: string;
  status: string;
  step: string | null;
  progress: number;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface DigestRow {
  id: string;
  audience: Audience;
  script: string;
  audio_path: string | null;
  pr_numbers: number[];
}

export async function getJobWithDigests(jobId: string): Promise<{ job: JobRow; digests: DigestRow[] } | null> {
  const { data: job, error: jobErr } = await supabaseService()
    .from('jobs')
    .select('id, status, step, progress, error, created_at, completed_at')
    .eq('id', jobId)
    .maybeSingle();
  if (jobErr || !job) return null;
  const { data: digests } = await supabaseService()
    .from('digests')
    .select('id, audience, script, audio_path, pr_numbers')
    .eq('job_id', jobId);
  return { job: job as JobRow, digests: (digests ?? []) as DigestRow[] };
}

export async function getConnectionIdBySession(sessionId: string): Promise<{ id: string; composio_conn_id: string; github_login: string | null } | null> {
  const { data } = await supabaseService()
    .from('connections')
    .select('id, composio_conn_id, github_login')
    .eq('session_id', sessionId)
    .eq('provider', 'github')
    .maybeSingle();
  return data ?? null;
}
