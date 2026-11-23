import { useTranslate } from '@/i18n/use-translate'
import type { SshClaudeDiagnosticResult } from '../../../../../shared/intranet/ssh-claude-diagnostic'
import { sshClaudeProblemCopy } from './ssh-claude-diagnostic-copy'

export function SshClaudeDiagnosticResultView({
  result
}: {
  result: SshClaudeDiagnosticResult
}): React.JSX.Element {
  const t = useTranslate()
  const labels = {
    connection: t('intranet.sshClaude.phaseConnection', 'SSH and Claude version'),
    response: t('intranet.sshClaude.phaseResponse', 'Claude response'),
    resume: t('intranet.sshClaude.phaseResume', 'Continue the same conversation'),
    cancellation: t('intranet.sshClaude.phaseCancellation', 'Stop a harmless test process')
  }
  const states = {
    pending: t('intranet.sshClaude.pending', 'Waiting'),
    running: t('intranet.sshClaude.running', 'Running'),
    passed: t('intranet.sshClaude.passed', 'Passed'),
    failed: t('intranet.sshClaude.failed', 'Failed'),
    skipped: t('intranet.sshClaude.skipped', 'Not tested'),
    cancelling: t('intranet.sshClaude.cancelling', 'Checking termination'),
    cancelled: t('intranet.sshClaude.cancelledState', 'Cancelled')
  }
  return (
    <div className="space-y-2" aria-live="polite">
      <p className="text-sm font-medium">
        {states[result.state]}
        {result.claudeVersion
          ? ` · ${t('intranet.sshClaude.version', 'Claude {{version}}', { version: result.claudeVersion })}`
          : ''}
      </p>
      <ol className="space-y-2">
        {result.steps.map((step) => (
          <li key={step.phase} className="space-y-1 text-settings-detail">
            <div className="flex items-center justify-between gap-3">
              <span>{labels[step.phase]}</span>
              <span className="text-muted-foreground">{states[step.state]}</span>
            </div>
            {step.problem ? (
              <p className="text-destructive">{sshClaudeProblemCopy(step.problem, t)}</p>
            ) : null}
          </li>
        ))}
      </ol>
      {result.stopVerified === false &&
      !result.steps.some((step) => step.problem === 'stop_unconfirmed') ? (
        <p role="alert" className="text-settings-detail text-destructive">
          {sshClaudeProblemCopy('stop_unconfirmed', t)}
        </p>
      ) : null}
    </div>
  )
}
