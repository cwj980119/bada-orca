import type { Translate } from '@/i18n/use-translate'
import type { SshClaudeDiagnosticProblem } from '../../../../../shared/intranet/ssh-claude-diagnostic'

export function sshClaudeProblemCopy(problem: SshClaudeDiagnosticProblem, t: Translate): string {
  const messages: Record<SshClaudeDiagnosticProblem, string> = {
    ssh_unavailable: t(
      'intranet.sshClaude.sshUnavailable',
      'OpenSSH could not start. Check that ssh is installed on this PC.'
    ),
    authentication: t(
      'intranet.sshClaude.authentication',
      'SSH authentication failed. Check the SSH username and password, or leave the password blank to use existing keys or SSO. Additional OTP prompts and jump-host passwords are not supported.'
    ),
    host_key: t(
      'intranet.sshClaude.hostKey',
      'SSH host verification failed. Verify the server in your SSH terminal before retrying.'
    ),
    ssh_failed: t(
      'intranet.sshClaude.sshFailed',
      'SSH could not complete the request. Check the destination, network, and SSH configuration.'
    ),
    linux_required: t(
      'intranet.sshClaude.linuxRequired',
      'This diagnostic requires a Linux SSH server.'
    ),
    directory_missing: t(
      'intranet.sshClaude.directoryMissing',
      'The remote project directory is unavailable.'
    ),
    claude_missing: t(
      'intranet.sshClaude.claudeMissing',
      'Claude was not found in the non-interactive SSH environment. Enter its absolute executable path.'
    ),
    process_control_missing: t(
      'intranet.sshClaude.processControlMissing',
      'The server needs setsid -w, timeout -k, sleep, and /proc for bounded execution. No Claude request was sent.'
    ),
    claude_failed: t(
      'intranet.sshClaude.claudeFailed',
      'Claude failed. Check the server-side CLI authentication, model access, and supported command-line options.'
    ),
    invalid_response: t(
      'intranet.sshClaude.invalidResponse',
      'Claude did not return the expected JSON response. Check the installed CLI version and model configuration.'
    ),
    resume_failed: t(
      'intranet.sshClaude.resumeFailed',
      'The resumed conversation did not recall the previous test token.'
    ),
    timed_out: t('intranet.sshClaude.timedOut', 'The request exceeded the time limit.'),
    remote_terminated: t(
      'intranet.sshClaude.remoteTerminated',
      'The remote request was terminated. It may have reached the server-side time limit.'
    ),
    output_limit: t(
      'intranet.sshClaude.outputLimit',
      'The response exceeded the diagnostic output limit.'
    ),
    cancelled: t('intranet.sshClaude.cancelled', 'The diagnostic was cancelled.'),
    stop_unconfirmed: t(
      'intranet.sshClaude.stopUnconfirmed',
      'Remote termination could not be confirmed. The remote time limit still applies; inspect the server before retrying.'
    ),
    internal_error: t(
      'intranet.sshClaude.internalError',
      'The diagnostic could not complete. Restart the test and copy the diagnostic result if it fails again.'
    )
  }
  return messages[problem]
}
