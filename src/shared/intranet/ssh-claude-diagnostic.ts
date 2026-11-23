import { z } from 'zod'

const remoteWord = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => !/[\0\r\n]/.test(value))

export const SshClaudeDiagnosticStart = z
  .object({
    destination: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[A-Za-z0-9][A-Za-z0-9_.@:[\]-]*$/),
    directory: z
      .string()
      .trim()
      .max(2048)
      .refine((value) => !/[\0\r\n]/.test(value) && (!value || value.startsWith('/')))
      .default(''),
    executable: remoteWord.default('claude'),
    mode: z.enum(['ssh', 'full']).optional(),
    timeoutSeconds: z.number().int().min(20).max(120).default(60),
    password: z.string().min(1).max(1024).optional()
  })
  .strict()
export const SshClaudeDiagnosticHandle = z.object({ id: z.string().uuid() }).strict()
export type SshClaudeDiagnosticInput = z.infer<typeof SshClaudeDiagnosticStart>
export type SshClaudeDiagnosticPhase = 'ssh' | 'connection' | 'response' | 'resume' | 'cancellation'
export type SshClaudeConnectionEvent =
  | 'password_mode'
  | 'key_or_sso_mode'
  | 'config_reading'
  | 'config_resolved'
  | 'connecting'
  | 'host_verified'
  | 'password_offered'
  | 'keyboard_password_offered'
  | 'unsupported_prompt'
  | 'authenticated'
  | 'command_opening'
  | 'command_opened'
  | 'command_completed'
  | 'proxy_unsupported'
  | 'exec_refused'
  | 'shell_opening'
  | 'shell_opened'
  | 'shell_ready'
export type SshClaudeConnectionObserver = (event: SshClaudeConnectionEvent, port?: number) => void
export type SshClaudeDiagnosticProblem =
  | 'ssh_unavailable'
  | 'authentication'
  | 'host_key'
  | 'ssh_failed'
  | 'ssh_configuration'
  | 'dns_failed'
  | 'connection_refused'
  | 'network_unreachable'
  | 'connection_reset'
  | 'ssh_negotiation'
  | 'authentication_method'
  | 'interactive_authentication'
  | 'command_refused'
  | 'ssh_protocol'
  | 'shell_refused'
  | 'shell_protocol'
  | 'linux_required'
  | 'directory_missing'
  | 'claude_missing'
  | 'process_control_missing'
  | 'claude_failed'
  | 'invalid_response'
  | 'resume_failed'
  | 'timed_out'
  | 'output_limit'
  | 'cancelled'
  | 'stop_unconfirmed'
  | 'remote_terminated'
  | 'internal_error'
export type SshClaudeDiagnosticStep = {
  phase: SshClaudeDiagnosticPhase
  state: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  problem?: SshClaudeDiagnosticProblem
}
export type SshClaudeDiagnosticResult = {
  id: string
  state: 'running' | 'cancelling' | 'passed' | 'failed' | 'cancelled'
  startedAt: string
  finishedAt?: string
  steps: SshClaudeDiagnosticStep[]
  claudeVersion?: string
  stopVerified?: boolean
  problem?: SshClaudeDiagnosticProblem
  mode?: 'ssh' | 'full'
  events?: SshClaudeConnectionEvent[]
  port?: number
  remoteDirectory?: string
}

export function sshClaudeDiagnosticReport(result: SshClaudeDiagnosticResult): string {
  return JSON.stringify(
    {
      format: 'orca-ssh-claude-diagnostic-v1',
      state: result.state,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      claudeVersion: result.claudeVersion,
      steps: result.steps.map(({ phase, state, problem }) => ({ phase, state, problem })),
      stopVerified: result.stopVerified,
      problem: result.problem,
      mode: result.mode,
      events: result.events?.slice(0, 20),
      port: result.port
    },
    null,
    2
  )
}
