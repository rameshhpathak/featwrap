export type Audience = 'marketing' | 'sales' | 'cs' | 'dev';
export type AudienceRequest = Audience | 'all';
export type PRKind = 'customer-facing' | 'internal';
export type JobStatus = 'pending' | 'running' | 'complete' | 'failed';

export interface PullRequest {
  number: number;
  title: string;
  body: string;
  author: string;
  mergedAt: string; // ISO
  headSha: string;
  diff: string;
}

export interface PRClassification {
  prNumber: number;
  headSha: string;
  kind: PRKind;
  reason: string;
}

export interface Script {
  audience: Audience;
  text: string;
  wordCount: number;
  prNumbers: number[];
}

export interface RenderedAudio {
  audience: Audience;
  mp3: Buffer;
}

export interface PipelineContext {
  jobId: string;
  repo: string;
  since: string;
  audience: AudienceRequest;
  connectionId: string;
  composioConnId: string;
}

export interface StepUpdate {
  step: string;
  progress: number; // 0..100
}

export type ProgressReporter = (update: StepUpdate) => Promise<void>;
