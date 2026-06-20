/** Every AI output type the system can generate from a transcript. */
export enum ContentType {
  SUMMARY_SHORT = 'summary_short',
  SUMMARY_LONG = 'summary_long',
  CHAPTER_NOTES = 'chapter_notes',
  KEY_TAKEAWAYS = 'key_takeaways',
  QUIZ = 'quiz',
  FLASHCARDS = 'flashcards',
  TRANSLATION = 'translation',
  // Phase 1.5 — content repurposing (same pipeline, different prompt).
  LINKEDIN_POST = 'linkedin_post',
  TWITTER_THREAD = 'twitter_thread',
  BLOG_OUTLINE = 'blog_outline',
  YOUTUBE_DESCRIPTION = 'youtube_description',
}

/** Background job lifecycle exposed to the frontend via GET /jobs/:id. */
export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/** Where a transcript came from — drives reliability/quality UI hints. */
export enum TranscriptSource {
  MANUAL = 'manual', // human-authored captions (highest quality)
  AUTO = 'auto', // YouTube auto-generated captions
  THIRD_PARTY = 'third_party', // fallback transcript API
  SPEECH_TO_TEXT = 'speech_to_text', // Whisper-class last resort
}
