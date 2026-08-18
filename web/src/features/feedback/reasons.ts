import type { FeedbackType } from '@/types';

export const LIKE_REASON_CODES = [
  'understood_request',
  'completed_task_correctly',
  'complete_response',
  'clear_response',
  'sufficient_sources',
  'other',
] as const;

export const DISLIKE_REASON_CODES = [
  'misunderstood_request',
  'incorrect_result',
  'incomplete_response',
  'insufficient_sources',
  'unsafe_content',
  'privacy_risk',
  'other',
] as const;

export type LikeReasonCode = (typeof LIKE_REASON_CODES)[number];
export type DislikeReasonCode = (typeof DISLIKE_REASON_CODES)[number];

export const getReasonCodes = (type: FeedbackType): readonly string[] =>
  type === 'like' ? LIKE_REASON_CODES : DISLIKE_REASON_CODES;

export const getReasonI18nKey = (code: string) => `feedback.reason.${code}`;
