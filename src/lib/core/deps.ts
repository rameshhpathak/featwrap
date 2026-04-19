import { composioExecute } from '@/lib/composio/client';
import { anthropicComplete } from '@/lib/anthropic';
import { ttsStream } from '@/lib/elevenlabs';
import { isStubVoice } from '@/lib/env';
import { supabaseClassificationCache } from '@/lib/supabase/cache';
import { insertDigest, updateJob } from '@/lib/supabase/jobs';
import { uploadMp3 } from '@/lib/supabase/storage';
import { listMergedPRs } from './sources/github';
import { classifyPRs } from './sources/classify';
import { writeScript } from './script/writer';
import { renderVoice } from './render/voice';
import type { PipelineDeps } from './pipeline';

export function liveDeps(): PipelineDeps {
  return {
    async fetchPRs(repo, since, composioConnId) {
      return listMergedPRs(repo, since, composioExecute, composioConnId);
    },
    async classifyPRs(prs, repo) {
      return classifyPRs(prs, {
        llmComplete: anthropicComplete,
        cache: supabaseClassificationCache(),
        repo,
      });
    },
    async writeScript(prs, classifications, audience, options) {
      return writeScript(
        prs,
        classifications,
        audience,
        { llmComplete: anthropicComplete },
        options,
      );
    },
    async renderVoice(script) {
      return renderVoice(script, {
        tts: ttsStream,
        voiceId: process.env.ELEVENLABS_VOICE_ID!,
        stub: isStubVoice(),
      });
    },
    storage: { uploadMp3 },
    db: { updateJob, insertDigest },
  };
}
