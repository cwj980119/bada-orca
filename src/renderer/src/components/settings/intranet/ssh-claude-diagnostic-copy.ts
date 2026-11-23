import type { Translate } from '@/i18n/use-translate'
import type { SshClaudeDiagnosticProblem } from '../../../../../shared/intranet/ssh-claude-diagnostic'

export function sshClaudeProblemCopy(problem: SshClaudeDiagnosticProblem, t: Translate): string {
  const messages: Record<SshClaudeDiagnosticProblem, string> = {
    shell_refused: t(
      'intranet.sshClaude.shellRefused',
      'The server refused both exec and terminal-shell channels. Check this account’s SSH session permissions.'
    ),
    shell_protocol: t(
      'intranet.sshClaude.shellProtocol',
      'The terminal shell closed without a command completion marker. Check the login shell, POSIX /bin/sh support, and any login menu. The command was not retried.'
    ),
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
    ssh_configuration: t(
      'intranet.sshClaude.sshConfiguration',
      'Could not resolve the OpenSSH configuration, or it uses unsupported ProxyUseFdpass. Password authentication has not completed.'
    ),
    dns_failed: t(
      'intranet.sshClaude.dnsFailed',
      'The SSH host name could not be resolved. Check the host or SSH alias.'
    ),
    connection_refused: t(
      'intranet.sshClaude.connectionRefused',
      'The SSH connection was refused before authentication. Check the resolved port and SSH service.'
    ),
    network_unreachable: t(
      'intranet.sshClaude.networkUnreachable',
      'The SSH server is unreachable. Check the company network or VPN route.'
    ),
    connection_reset: t(
      'intranet.sshClaude.connectionReset',
      'The server or network closed the SSH connection. Check the last completed connection stage.'
    ),
    ssh_negotiation: t(
      'intranet.sshClaude.sshNegotiation',
      'SSH encryption negotiation failed before password authentication. Compare with a normal OpenSSH terminal connection; the server may require different algorithms.'
    ),
    authentication_method: t(
      'intranet.sshClaude.authenticationMethod',
      'The server requires an authentication method other than password or keyboard-interactive. A key or another factor may be required.'
    ),
    interactive_authentication: t(
      'intranet.sshClaude.interactiveAuthentication',
      'The server requested an additional or unsupported interactive answer. No password was substituted for an OTP or confirmation prompt.'
    ),
    command_refused: t(
      'intranet.sshClaude.commandRefused',
      'SSH login succeeded, but the server refused a remote command channel. Check whether this account allows non-interactive SSH commands.'
    ),
    ssh_protocol: t(
      'intranet.sshClaude.sshProtocol',
      'SSH did not return the test command marker. Check for a login menu, forced command, or shell output that replaces command execution.'
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
