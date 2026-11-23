import { StringDecoder } from 'node:string_decoder'
import type { ServerChannel } from 'ssh2'

export function serveSshClaudeShell(
  channel: ServerChannel,
  commands: string[],
  mode: string,
  reply: { stdout: string; code: number }
): void {
  const decoder = new StringDecoder('utf8')
  let buffer = ''
  let marker = ''
  let finished = false
  const records: string[] = []
  channel.write('Company login banner\r\nfixture$ ')
  channel.on('data', (data: Buffer) => {
    buffer += decoder.write(data)
    while (!finished && buffer.includes('\n')) {
      const end = buffer.indexOf('\n')
      const line = buffer.slice(0, end)
      buffer = buffer.slice(end + 1)
      if (!marker) {
        marker = line.match(/orca-shell-[a-f0-9-]+/)?.[0] ?? ''
        channel.write(`${line}\r\n`)
        if (marker) {
          channel.write(`\r\n${marker}:rea`)
          channel.write('dy\r\n')
        }
        continue
      }
      if (line !== `${marker}:input-end`) {
        records.push(line)
        continue
      }
      finished = true
      commands.push(
        records
          .join('')
          .replace(/\\0([0-7]{3})/g, (_value, octal: string) =>
            String.fromCharCode(Number.parseInt(octal, 8))
          )
      )
      channel.write(`${records.join('\r\n')}\r\n`)
      channel.write(`\r\n${marker}:begin\r\n`)
      const output = Buffer.from(reply.stdout.replace(/\n/g, '\r\n'))
      channel.write(output.subarray(0, 2))
      channel.write(output.subarray(2))
      if (mode === 'stall-shell') {
        return
      }
      if (mode !== 'broken-shell') {
        channel.write(`\r\n${marker}:end:${reply.code}\r\n`)
      }
      channel.exit(reply.code)
      channel.end('fixture$ ')
    }
  })
}
