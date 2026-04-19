import { ElevenLabsClient } from 'elevenlabs';
import type { Readable } from 'node:stream';
import type { TTSStreamFn } from './core/render/voice';
import { isStubVoice } from './env';

let cached: ElevenLabsClient | null = null;
function client(): ElevenLabsClient {
  if (cached) return cached;
  cached = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
  return cached;
}

async function* emptyStream(): AsyncIterable<Uint8Array> {
  // no chunks — used for stub mode so callers get a harmless iterable
}

/**
 * Adapt a Node Readable (what elevenlabs@1.x returns) into an
 * AsyncIterable<Uint8Array>. Readables in modern Node are already async
 * iterables, but they yield Buffer; Buffer extends Uint8Array so this is
 * a structural cast, not a copy.
 */
function toAsyncIterable(stream: Readable): AsyncIterable<Uint8Array> {
  return stream as unknown as AsyncIterable<Uint8Array>;
}

export const ttsStream: TTSStreamFn = async ({ voiceId, text, modelId }) => {
  if (isStubVoice()) return emptyStream();
  const stream = await client().textToSpeech.convertAsStream(voiceId, {
    text,
    model_id: modelId ?? 'eleven_multilingual_v2',
  });
  return toAsyncIterable(stream);
};

export { isStubVoice };
