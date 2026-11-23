import '../../daemon/emulation/xterm-env-polyfill'
import { Terminal } from '@xterm/headless'

export class SshClaudeConsoleScreen {
  private readonly terminal = new Terminal({
    cols: 4096,
    rows: 30,
    scrollback: 4096,
    allowProposedApi: true
  })

  write(chunk: string, receive: (text: string) => void): void {
    this.terminal.write(chunk, () => {
      const buffer = this.terminal.buffer.active
      let text = ''
      for (let row = 0; row <= buffer.baseY + buffer.cursorY; row++) {
        const line = buffer.getLine(row)
        if (row && !line?.isWrapped) {
          text += '\n'
        }
        text += line?.translateToString(true) ?? ''
      }
      receive(text)
    })
  }

  dispose(): void {
    this.terminal.dispose()
  }
}
