/** Mirrors the backend wire contract (would live in @tubeai/shared). */

export interface Envelope<T> {
  success: boolean;
  data: T;
}

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  planKey: string;
  planStatus: string;
  emailVerified: boolean;
}

export interface Entitlements {
  videosPerDay: number;
  generationsPerDay: number;
  maxVideoDurationSec: number;
  librarySize: number;
  allowedOutputs: string[];
  translation: boolean;
  playlist: boolean;
  pdfExport: boolean;
  aiChat: boolean;
  removeWatermark: boolean;
  prioritySupport: boolean;
}

export interface Plan {
  key: string;
  name: string;
  description?: string;
  badge?: string;
  price: { monthly: number; yearly: number; currency: string };
  entitlements: Entitlements;
}

export interface VideoMeta {
  youtubeId: string;
  title?: string;
  channel?: string;
  durationSec: number;
  thumbnailUrl?: string;
}

export interface ExtractResult {
  videoId: string;
  youtubeId: string;
  transcriptId: string;
  language: string;
  cached: boolean;
  meta: VideoMeta;
}

export type ContentType =
  | 'summary_short'
  | 'summary_long'
  | 'chapter_notes'
  | 'key_takeaways'
  | 'quiz'
  | 'flashcards'
  | 'translation'
  | 'linkedin_post'
  | 'twitter_thread'
  | 'blog_outline'
  | 'youtube_description';

export type JobState = 'queued' | 'processing' | 'completed' | 'failed';

export interface JobStatus<T = unknown> {
  jobId: string;
  status: JobState;
  progress?: number;
  result?: T | null;
  failedReason?: string | null;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}
export interface QuizPayload {
  questions: QuizQuestion[];
}
export interface Flashcard {
  front: string;
  back: string;
}
export interface FlashcardsPayload {
  cards: Flashcard[];
}

export interface GenerateResult {
  generatedId: string;
  type: ContentType;
  language: string;
  payload: unknown;
  aiModel?: string;
  tokensUsed?: number;
}

export interface GeneratedContent {
  _id: string;
  type: ContentType;
  language: string;
  payload: unknown;
  aiModel?: string;
  saved?: boolean;
  createdAt?: string;
  updatedAt?: string;
  video?: {
    _id: string;
    title?: string;
    channel?: string;
    thumbnailUrl?: string;
    youtubeId?: string;
    durationSec?: number;
  };
}

export interface UsageMeter {
  used: number;
  limit: number;
  remaining: number;
}
export interface UsageSummary {
  videos: UsageMeter;
  generations: UsageMeter;
}
