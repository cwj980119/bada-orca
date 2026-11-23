import type { SshClaudeDiagnosticProblem } from '../../../shared/intranet/ssh-claude-diagnostic'

export class SshClaudeDiagnosticFailure extends Error {
  constructor(readonly problem: SshClaudeDiagnosticProblem) {
    super(problem)
  }
}

export function sshClaudeFailure(error: unknown): SshClaudeDiagnosticProblem {
  if (error instanceof SshClaudeDiagnosticFailure) {
    return error.problem
  }
  const message = typeof error === 'string' ? error : error instanceof Error ? error.message : ''
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
  if (
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    /could not resolve hostname|getaddrinfo/i.test(message)
  ) {
    return 'dns_failed'
  }
  if (code === 'ECONNREFUSED' || /connection refused/i.test(message)) {
    return 'connection_refused'
  }
  if (
    code === 'ENETUNREACH' ||
    code === 'EHOSTUNREACH' ||
    /no route to host|network is unreachable/i.test(message)
  ) {
    return 'network_unreachable'
  }
  if (code === 'ETIMEDOUT' || /timed? ?out/i.test(message)) {
    return 'timed_out'
  }
  if (
    code === 'ECONNRESET' ||
    /(?:connection|session) (?:reset|closed)|socket.*closed/i.test(message)
  ) {
    return 'connection_reset'
  }
  if (
    /no matching|handshake failed|key exchange|unsupported.*(?:cipher|algorithm)/i.test(message)
  ) {
    return 'ssh_negotiation'
  }
  if (
    /permission denied|authentication (?:methods )?failed|no supported authentication|sign_and_send_pubkey/i.test(
      message
    )
  ) {
    return 'authentication'
  }
  if (/host key verification failed|remote host identification has changed/i.test(message)) {
    return 'host_key'
  }
  return 'ssh_failed'
}
