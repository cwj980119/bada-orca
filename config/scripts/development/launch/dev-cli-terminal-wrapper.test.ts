import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runProcess } from '@orca/process-host'
import { describe, expect, it } from 'vitest'
import { ensureDevLauncher } from '../../../../src/main/cli/launchers/cli-dev-launcher'
import { resolveGitBashPath } from '../../../../src/main/pty/shell-startup/git-bash'
import { prepareDevCliTerminalWrappers } from './dev-cli-terminal-wrapper.mjs'

const bash = process.platform === 'win32' ? resolveGitBashPath() : '/bin/bash'
const probe = `process.stdout.write(JSON.stringify({
  args: process.argv.slice(2),
  profile: require('node:path').basename(process.env.ORCA_USER_DATA_PATH)
}) + '\\n')`

async function checkCommands(binDir: string): Promise<void> {
  const result = await runProcess({
    program: bash ?? '/bin/bash',
    args: [
      '--noprofile',
      '--norc',
      '-c',
      `export PATH="$(cd -- "$1" && pwd):$PATH"
orca probe 'two words' 'line
break' 'quote" $HOME ; & % !'
orca-dev probe 'two words' 'line
break' 'quote" $HOME ; & % !'`,
      'cli-test',
      binDir.replaceAll('\\', '/')
    ]
  })
  expect(result.code, result.stderr).toBe(0)
  expect(
    result.stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
  ).toEqual([
    { args: ['probe', 'two words', 'line\nbreak', 'quote" $HOME ; & % !'], profile: 'profile' },
    { args: ['probe', 'two words', 'line\nbreak', 'quote" $HOME ; & % !'], profile: 'profile' }
  ])
}

describe.runIf(bash !== null)('development CLI discovery in Bash', () => {
  it('runs both command names from the dev runner without global registration', async () => {
    const root = await mkdtemp(join(tmpdir(), "orca dev '$cli-"))
    try {
      const entryDir = join(root, 'out', 'cli')
      await mkdir(entryDir, { recursive: true })
      await writeFile(join(entryDir, 'index.js'), probe)
      const { binDir, userDataBinDir } = prepareDevCliTerminalWrappers({
        repoRoot: root,
        userDataPath: join(root, 'profile'),
        electronExecutable: process.execPath
      })
      await checkCommands(binDir)
      await checkCommands(userDataBinDir)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('keeps both command names available when the app refreshes its dev launcher', async () => {
    const root = await mkdtemp(join(tmpdir(), "orca dev '$cli-"))
    try {
      const cliEntryPath = join(root, 'cli.cjs')
      await writeFile(cliEntryPath, probe)
      await ensureDevLauncher({
        platform: process.platform,
        userDataPath: join(root, 'profile'),
        execPath: process.execPath,
        cliEntryPath,
        commandName: 'orca-dev'
      })
      await checkCommands(join(root, 'profile', 'cli', 'bin'))
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
