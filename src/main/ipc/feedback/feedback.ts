import type {
  FeedbackSubmitArgs,
  FeedbackSubmitResult
} from '../../../shared/feedback/feedback-submit-contract'
import type { FeedbackDiagnosticBundleAttachment, FeedbackSubmissionType } from './feedback-request'

type InternalFeedbackSubmitArgs = FeedbackSubmitArgs & {
  submissionType?: FeedbackSubmissionType
  diagnosticBundle?: FeedbackDiagnosticBundleAttachment
  feedbackWithoutDiagnosticBundle?: string
}

export async function submitFeedback(
  _args: InternalFeedbackSubmitArgs
): Promise<FeedbackSubmitResult> {
  throw new Error('This service is not included in the internal edition.')
}

export function registerFeedbackHandlers(): void {
  throw new Error('This service is not included in the internal edition.')
}
