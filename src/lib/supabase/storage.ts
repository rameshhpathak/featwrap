import { supabaseService } from './server';
import type { Audience } from '../core/types';

const BUCKET = 'media';

export async function uploadMp3(jobId: string, audience: Audience, mp3: Buffer): Promise<string> {
  const path = `jobs/${jobId}/${audience}.mp3`;
  const { error } = await supabaseService().storage
    .from(BUCKET)
    .upload(path, mp3, { contentType: 'audio/mpeg', upsert: true });
  if (error) throw error;
  return path;
}

export async function signedUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabaseService().storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
