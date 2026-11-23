import { quotePosixShell as quote } from '../../../shared/shell/launch/shell-argument-quoting'
import type { SshClaudeDiagnosticInput } from '../../../shared/intranet/ssh-claude-diagnostic'

export function claudeDiagnosticPreflight(input: SshClaudeDiagnosticInput, marker: string): string {
  return [
    `[ "$(uname -s)" = Linux ] || { echo ${quote(`${marker}:linux_required`)}; exit 41; }`,
    ...(input.directory
      ? [
          `cd ${quote(input.directory)} 2>/dev/null || { echo ${quote(`${marker}:directory_missing`)}; exit 42; }`
        ]
      : []),
    `command -v ${quote(input.executable)} >/dev/null 2>&1 || { echo ${quote(`${marker}:claude_missing`)}; exit 43; }`,
    `command -v setsid >/dev/null 2>&1 && command -v timeout >/dev/null 2>&1 && command -v sleep >/dev/null 2>&1 && test -r /proc/self/cmdline && setsid -w /bin/sh -c ':' && timeout -k 1 1 /bin/sh -c ':' || { echo ${quote(`${marker}:process_control_missing`)}; exit 44; }`,
    `echo ${quote(`${marker}:version`)}`,
    `timeout -k 1 10 ${quote(input.executable)} --version`
  ].join('\n')
}

export function claudeDiagnosticCommand(
  input: SshClaudeDiagnosticInput,
  sessionId: string,
  prompt: string,
  resume: boolean
): string[] {
  return [
    input.executable,
    '-p',
    prompt,
    '--output-format',
    'json',
    '--tools',
    '',
    '--disallowedTools',
    'mcp__*',
    '--settings',
    '{"disableAllHooks":true}',
    '--max-turns',
    '1',
    '--strict-mcp-config',
    '--mcp-config',
    '{"mcpServers":{}}',
    resume ? '--resume' : '--session-id',
    sessionId
  ]
}

export function ownedDiagnosticCommand(
  directory: string,
  marker: string,
  seconds: number,
  args: string[]
): string {
  const child = `printf '%s:pid:%s\\n' ${quote(marker)} "$1"; shift; exec "$@"`
  const supervisor = [
    `trap 'trap "" TERM HUP INT; kill -TERM "-$$" 2>/dev/null; exit 143' TERM HUP INT`,
    'foreground=',
    'case "$(timeout --help 2>&1)" in *--foreground*) foreground=--foreground ;; esac',
    `timeout $foreground -k 5 ${seconds} /bin/sh -c ${quote(child)} ${quote(marker)} "$$" "$@" &`,
    'child=$!',
    'wait "$child"; result=$?',
    'trap "" TERM HUP INT',
    'kill -TERM "-$$" 2>/dev/null || true',
    'exit "$result"'
  ].join('\n')
  // Keep the ownership marker on the group leader; its deadline also cleans up after SSH disconnects.
  return `${directory ? `cd ${quote(directory)} && ` : ''}exec setsid -w /bin/sh -c ${quote(supervisor)} ${quote(marker)} ${args.map(quote).join(' ')}`
}

export function stopDiagnosticCommand(pid: number, marker: string): string {
  if (!Number.isSafeInteger(pid) || pid < 2 || !/^orca-diag-[a-f0-9-]+$/.test(marker)) {
    throw new Error('Invalid diagnostic process identity')
  }
  return [
    `if ! test -r /proc/${pid}/cmdline; then if kill -0 -${pid} 2>/dev/null; then exit 45; fi; echo ${quote(`${marker}:stopped`)}; exit 0; fi`,
    `case "$(tr '\\000' ' ' < /proc/${pid}/cmdline)" in *${quote(marker)}*) ;; *) exit 45 ;; esac`,
    `kill -TERM -${pid} 2>/dev/null || true`,
    'for attempt in 1 2 3 4 5; do',
    `  if ! kill -0 -${pid} 2>/dev/null; then echo ${quote(`${marker}:stopped`)}; exit 0; fi`,
    '  sleep 1',
    'done',
    'exit 46'
  ].join('\n')
}
