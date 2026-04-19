import { supabaseService } from './server';
import type { ClassificationCache } from '../core/sources/classify';
import type { PRKind } from '../core/types';

export function supabaseClassificationCache(): ClassificationCache {
  return {
    async get(repo, prNumber, headSha) {
      const { data } = await supabaseService()
        .from('pr_classifications')
        .select('kind, reason')
        .eq('repo', repo)
        .eq('pr_number', prNumber)
        .eq('head_sha', headSha)
        .maybeSingle();
      if (!data) return null;
      return { kind: data.kind as PRKind, reason: data.reason ?? '' };
    },
    async set(repo, prNumber, headSha, value) {
      await supabaseService()
        .from('pr_classifications')
        .upsert({ repo, pr_number: prNumber, head_sha: headSha, kind: value.kind, reason: value.reason });
    },
  };
}
