import { describe, it, expect, vi } from 'vitest';
import { renderVoice, type VoiceDeps } from '@/lib/core/render/voice';
import type { Script } from '@/lib/core/types';

const script: Script = {
  audience: 'marketing',
  text: 'Hello world from featwrap.',
  wordCount: 5,
  prNumbers: [12],
};

describe('renderVoice', () => {
  it('calls the TTS client with the script text and voice id', async () => {
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4])];
    const tts = vi.fn().mockResolvedValue((async function* () { for (const c of chunks) yield c; })());
    const deps: VoiceDeps = { tts, voiceId: 'voice-xyz' };
    const buf = await renderVoice(script, deps);
    expect(tts).toHaveBeenCalledWith(expect.objectContaining({
      voiceId: 'voice-xyz',
      text: 'Hello world from featwrap.',
    }));
    expect(buf.equals(Buffer.from([1, 2, 3, 4]))).toBe(true);
  });

  it('returns stub audio when stub flag is set', async () => {
    const tts = vi.fn();
    const deps: VoiceDeps = { tts, voiceId: 'voice-xyz', stub: true };
    const buf = await renderVoice(script, deps);
    expect(tts).not.toHaveBeenCalled();
    expect(buf.length).toBeGreaterThan(0); // silent stub bytes
  });
});
