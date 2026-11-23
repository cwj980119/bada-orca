import {
  SshClaudeDiagnosticStart,
  SshClaudeDiagnosticHandle
} from '../../../../shared/intranet/ssh-claude-diagnostic'
import { SshClaudeDiagnosticJob } from '../../../ssh/claude-diagnostic/ssh-claude-diagnostic-job'
import { sshDiagnosticTransport } from '../../../ssh/claude-diagnostic/ssh-claude-transport'
import { defineMethod, InvalidArgumentError, type RpcContext } from '../core'

let current: SshClaudeDiagnosticJob | null = null

function desktop(context: RpcContext): void {
  if (context.caller?.kind !== 'desktop') {
    throw new InvalidArgumentError('Run this diagnostic from the desktop app.')
  }
}

function find(id: string, context: RpcContext): SshClaudeDiagnosticJob {
  desktop(context)
  if (!current || current.snapshot().id !== id) {
    throw new InvalidArgumentError('diagnostic_not_found')
  }
  return current
}

export const SSH_CLAUDE_DIAGNOSTIC_METHODS = [
  defineMethod({
    name: 'intranet.sshClaudeCurrent',
    permission: 'workspace',
    params: null,
    handler: (_params, context) => {
      desktop(context)
      return current?.snapshot() ?? null
    }
  }),
  defineMethod({
    name: 'intranet.sshClaudeStart',
    permission: 'workspace',
    params: SshClaudeDiagnosticStart,
    handler: (input, context) => {
      desktop(context)
      if (current && ['running', 'cancelling'].includes(current.snapshot().state)) {
        throw new InvalidArgumentError('diagnostic_already_running')
      }
      const target = {
        id: 'ssh-claude-diagnostic',
        label: 'SSH Claude diagnostic',
        configHost: input.destination,
        host: input.destination,
        username: '',
        port: 22
      }
      const { password, ...diagnosticInput } = input
      const transport = sshDiagnosticTransport(target, password)
      current = new SshClaudeDiagnosticJob(diagnosticInput, transport.execute)
      void current.run().finally(transport.close)
      return current.snapshot()
    }
  }),
  defineMethod({
    name: 'intranet.sshClaudeStatus',
    permission: 'workspace',
    params: SshClaudeDiagnosticHandle,
    handler: ({ id }, context) => find(id, context).snapshot()
  }),
  defineMethod({
    name: 'intranet.sshClaudeCancel',
    permission: 'workspace',
    params: SshClaudeDiagnosticHandle,
    handler: ({ id }, context) => {
      const job = find(id, context)
      job.cancel()
      return job.snapshot()
    }
  })
] as const
