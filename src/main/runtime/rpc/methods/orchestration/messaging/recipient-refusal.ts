import type { SessionRecipientRefusal } from './session-recipient'
import type { BareRecipientResolution } from './recipient-routing'

export function refusedRecipient(
  recipient: string,
  refusal: SessionRecipientRefusal
): BareRecipientResolution {
  return {
    ok: false,
    code: refusal.code,
    message: refusal.message,
    warning: { code: 'recipient_unreachable', recipient, message: refusal.message }
  }
}
