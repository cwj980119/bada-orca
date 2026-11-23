import { useTranslate } from '@/i18n/use-translate'
import type {
  SshClaudeConnectionEvent,
  SshClaudeDiagnosticResult
} from '../../../../../shared/intranet/ssh-claude-diagnostic'

export function SshClaudeConnectionLog({
  result
}: {
  result: SshClaudeDiagnosticResult
}): React.JSX.Element {
  const t = useTranslate()
  const labels: Record<SshClaudeConnectionEvent, string> = {
    password_mode: t(
      'intranet.sshClaude.event.passwordMode',
      'Password option received (value hidden)'
    ),
    key_or_sso_mode: t('intranet.sshClaude.event.keyMode', 'Using existing keys or SSO'),
    config_reading: t('intranet.sshClaude.event.configReading', 'Reading OpenSSH configuration'),
    config_resolved: t(
      'intranet.sshClaude.event.configResolved',
      'SSH destination configuration resolved'
    ),
    connecting: t('intranet.sshClaude.event.connecting', 'Starting SSH connection and handshake'),
    host_verified: t('intranet.sshClaude.event.hostVerified', 'Host key check completed'),
    password_offered: t(
      'intranet.sshClaude.event.passwordOffered',
      'Attempting password authentication'
    ),
    keyboard_password_offered: t(
      'intranet.sshClaude.event.keyboardPassword',
      'Answering the SSH password challenge'
    ),
    unsupported_prompt: t(
      'intranet.sshClaude.event.unsupportedPrompt',
      'Additional or unsupported authentication prompt received'
    ),
    authenticated: t('intranet.sshClaude.event.authenticated', 'SSH authentication succeeded'),
    command_opening: t(
      'intranet.sshClaude.event.commandOpening',
      'Requesting a remote command channel'
    ),
    command_opened: t('intranet.sshClaude.event.commandOpened', 'Remote command channel opened'),
    command_completed: t(
      'intranet.sshClaude.event.commandCompleted',
      'Remote command completed successfully'
    ),
    proxy_unsupported: t(
      'intranet.sshClaude.event.proxyUnsupported',
      'ProxyUseFdpass is unsupported for password tests'
    )
  }
  return (
    <div className="space-y-2 text-settings-detail">
      {result.port ? (
        <p>
          {t('intranet.sshClaude.resolvedPort', 'Resolved SSH port: {{port}}', {
            port: result.port
          })}
        </p>
      ) : null}
      {result.events?.length ? (
        <div>
          <p className="font-medium">
            {t('intranet.sshClaude.connectionLog', 'Connection details')}
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            {result.events.map((event) => (
              <li key={event}>{labels[event]}</li>
            ))}
          </ol>
        </div>
      ) : null}
      {result.remoteDirectory ? (
        <p className="break-all">
          {t(
            'intranet.sshClaude.remoteDirectory',
            'Server default login directory: {{directory}}',
            { directory: result.remoteDirectory }
          )}
        </p>
      ) : null}
    </div>
  )
}
