import { randomUUID } from 'node:crypto'
import { encodePosixPrintfRecords } from '../../../shared/shell/launch/posix-printf-encoding'
import { quotePosixShell as quote } from '../../../shared/shell/launch/shell-argument-quoting'
import { SshClaudeDiagnosticFailure } from './ssh-claude-failure'

export class SshClaudeShellFrame {
  private readonly marker = `orca-shell-${randomUUID()}`
  private buffer = ''
  private ready = false
  private started = false

  constructor(private readonly command: string) {}

  launch(): string {
    const driver = [
      'stty -echo -onlcr 2>/dev/null || true',
      `printf '\\n%s\\n' ${quote(`${this.marker}:ready`)}`,
      'encoded=',
      'complete=',
      `while IFS= read -r line; do if [ "$line" = ${quote(`${this.marker}:input-end`)} ]; then complete=1; break; fi; encoded=$encoded$line; done`,
      '[ "$complete" = 1 ] || exit 125',
      'decoded=$(printf %b "$encoded" && printf _) || exit 125',
      'decoded=${decoded%_}',
      `printf '\\n%s\\n' ${quote(`${this.marker}:begin`)}`,
      '/bin/sh -c "$decoded" </dev/null 2>/dev/null',
      'result=$?',
      `printf '\\n%s:%s\\n' ${quote(`${this.marker}:end`)} "$result"`,
      'exit "$result"'
    ].join('; ')
    return `exec /bin/sh -c ${quote(driver)}\n`
  }

  push(text: string): { send?: string; stdout: string; code?: number } {
    this.buffer += text.replace(/\r/g, '')
    if (Buffer.byteLength(this.buffer) > 256 * 1024) {
      throw new SshClaudeDiagnosticFailure('output_limit')
    }
    if (!this.ready) {
      const ready = this.buffer.indexOf(`\n${this.marker}:ready\n`)
      if (ready === -1) {
        return { stdout: '' }
      }
      this.ready = true
      this.buffer = this.buffer.slice(ready + this.marker.length + 8)
      return {
        send: [...encodePosixPrintfRecords(this.command), `${this.marker}:input-end`, ''].join(
          '\n'
        ),
        stdout: ''
      }
    }
    if (!this.started) {
      const begin = this.buffer.indexOf(`\n${this.marker}:begin\n`)
      if (begin === -1) {
        return { stdout: '' }
      }
      this.started = true
      this.buffer = this.buffer.slice(begin + this.marker.length + 8)
    }
    const end = this.buffer.match(new RegExp(`\\n${this.marker}:end:([0-9]{1,3})\\n`))
    if (!end) {
      return { stdout: this.buffer }
    }
    const code = Number(end[1])
    if (code > 255) {
      throw new SshClaudeDiagnosticFailure('shell_protocol')
    }
    return { stdout: this.buffer.slice(0, end.index), code }
  }
}
