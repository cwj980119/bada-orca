import type {
  FeedbackImageAttachment,
  FeedbackRequestFailure
} from '../../../shared/feedback/feedback-submit-contract'
const FEEDBACK_REQUEST_TIMEOUT_MS = 10_000

export type FeedbackSubmissionType = 'feedback' | 'crash'

export type FeedbackDiagnosticBundleAttachment = {
  bundleSubmissionId: string
  content: string
  bytes: number
  spanCount: number
}

export type FeedbackSubmitBody = {
  feedback: string
  submissionType: FeedbackSubmissionType
  githubLogin: string | null
  githubEmail: string | null
  appVersion: string
  platform: NodeJS.Platform
  osRelease: string
  arch: string
  diagnosticBundle?: FeedbackDiagnosticBundleAttachment
  images?: FeedbackImageAttachment[]
}

export async function postFeedback(
  _url: string,
  _body: FeedbackSubmitBody,
  _timeoutMs = FEEDBACK_REQUEST_TIMEOUT_MS,
  _readResponse?: (response: Response) => Promise<void>
): Promise<Response> {
  throw new Error('This service is not included in the internal edition.')
}

export function messageFromError(_error: unknown): string {
  throw new Error('This service is not included in the internal edition.')
}

export function responseFailure(_response: Response): FeedbackRequestFailure {
  throw new Error('This service is not included in the internal edition.')
}

export function errorFailure(_error: unknown): FeedbackRequestFailure {
  throw new Error('This service is not included in the internal edition.')
}
