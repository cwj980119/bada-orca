import { acpLaunchInstructions, deliverOpenCodeInstructions } from '../acp/launch/acp-instructions'
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { writeOpenCodeInstructionsConfigDir } from './opencode-instructions-config-dir'

let root = ''
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'opencode-instructions-config-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('OpenCode 2.x instructions config folder', () => {
  it('writes only the instructions when the user has no config folder', async () => {
    const folder = join(root, 'chat')
    await mkdir(folder)
    await writeOpenCodeInstructionsConfigDir(folder, join(root, 'missing'), 'You are Zorblax.')
    expect(await readdir(folder)).toEqual(['AGENTS.md'])
    expect(await readFile(join(folder, 'AGENTS.md'), 'utf8')).toBe('You are Zorblax.\n')
  })

  it("links every other entry of the user's folder, folders included", async () => {
    const source = join(root, 'source')
    await mkdir(join(source, 'agents'), { recursive: true })
    await writeFile(join(source, 'agents', 'mine.md'), 'agent')
    await writeFile(join(source, 'opencode.jsonc'), '{}')
    const folder = join(root, 'chat')
    await mkdir(folder)
    await writeOpenCodeInstructionsConfigDir(folder, source, 'You are Zorblax.')
    expect((await readdir(folder)).toSorted()).toEqual(['AGENTS.md', 'agents', 'opencode.jsonc'])
    expect(await readFile(join(folder, 'agents', 'mine.md'), 'utf8')).toBe('agent')
  })

  it.skipIf(process.platform === 'win32')(
    'reads a config folder that is itself a link',
    async () => {
      const real = join(root, 'dotfiles-opencode')
      await mkdir(real)
      await writeFile(join(real, 'opencode.json'), '{}')
      await writeFile(join(real, 'AGENTS.md'), 'Mine.')
      await symlink(real, join(root, 'linked'), 'dir')
      const folder = join(root, 'chat')
      await mkdir(folder)
      await writeOpenCodeInstructionsConfigDir(folder, join(root, 'linked'), 'You are Zorblax.')
      expect((await readdir(folder)).toSorted()).toEqual(['AGENTS.md', 'opencode.json'])
      expect(await readFile(join(folder, 'AGENTS.md'), 'utf8')).toBe('Mine.\n\nYou are Zorblax.\n')
    }
  )
  it('passes a v2 bot preamble without replacing its existing model configuration or global instructions', async () => {
    const source = join(root, 'user-config')
    await mkdir(source)
    await writeFile(join(source, 'AGENTS.md'), 'Company global rules')
    const launch = await acpLaunchInstructions(
      { agent: 'opencode2', instructions: deliverOpenCodeInstructions },
      root,
      {
        sessionId: 'bot-session',
        text: 'Bot role and memory',
        env: { OPENCODE_CONFIG_DIR: source, OPENCODE_CONFIG_CONTENT: '{"model":"internal/coder"}' }
      }
    )
    const folder = launch?.env?.OPENCODE_CONFIG_DIR
    expect(folder).toBeTruthy()
    if (!folder) {
      throw new Error('Missing instruction folder.')
    }
    expect(await readFile(join(folder, 'AGENTS.md'), 'utf8')).toBe(
      'Company global rules\n\nBot role and memory\n'
    )
    expect(await readFile(join(source, 'AGENTS.md'), 'utf8')).toBe('Company global rules')
    expect(launch?.env?.OPENCODE_CONFIG_CONTENT).toBeUndefined()
  })
})
