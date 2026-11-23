import { SshClaudeDiagnosticFailure } from './ssh-claude-failure'
import type { SshDiagnosticReply } from './ssh-claude-transport'

export function readClaudeDiagnosticResult(
  reply: SshDiagnosticReply,
  marker: string,
  sessionId: string
): string {
  if (reply.code === 124 || reply.code === 137) {
    throw new SshClaudeDiagnosticFailure('timed_out')
  }
  if (reply.code === 143) {
    throw new SshClaudeDiagnosticFailure('remote_terminated')
  }
  if (reply.code !== 0) {
    throw new SshClaudeDiagnosticFailure('claude_failed')
  }
  const start = reply.stdout.indexOf(`${marker}:pid:`)
  const lineEnd = reply.stdout.indexOf('\n', start)
  if (start === -1 || lineEnd === -1) {
    throw new SshClaudeDiagnosticFailure('invalid_response')
  }
  let value: unknown
  try {
    value = JSON.parse(reply.stdout.slice(lineEnd + 1).trim())
  } catch {
    throw new SshClaudeDiagnosticFailure('invalid_response')
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    !('type' in value) ||
    value.type !== 'result' ||
    !('session_id' in value) ||
    value.session_id !== sessionId ||
    !('is_error' in value) ||
    value.is_error !== false ||
    !('result' in value) ||
    typeof value.result !== 'string'
  ) {
    throw new SshClaudeDiagnosticFailure('invalid_response')
  }
  return value.result.trim()
}
