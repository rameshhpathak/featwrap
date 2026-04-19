import type { Script } from '../types';

export type TTSStreamFn = (args: {
  voiceId: string;
  text: string;
  modelId?: string;
}) => Promise<AsyncIterable<Uint8Array>>;

export interface VoiceDeps {
  tts: TTSStreamFn;
  voiceId: string;
  stub?: boolean;
}

// 1 second of MP3 silence (constant, tiny). Use this as the stub.
// Generated once: "ffmpeg -f lavfi -i anullsrc=r=22050:cl=mono -t 1 -q:a 9 silent.mp3"
// then base64'd. Keeping it inline here so the stub is zero-dep.
const SILENT_MP3_BASE64 =
  '//uSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function renderVoice(script: Script, deps: VoiceDeps): Promise<Buffer> {
  if (deps.stub) return Buffer.from(SILENT_MP3_BASE64, 'base64');
  const stream = await deps.tts({
    voiceId: deps.voiceId,
    text: script.text,
    modelId: 'eleven_multilingual_v2',
  });
  const parts: Uint8Array[] = [];
  for await (const chunk of stream) parts.push(chunk);
  return Buffer.concat(parts);
}
