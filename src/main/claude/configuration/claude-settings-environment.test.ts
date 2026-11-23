import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { claudeSettingsLaunch, withClaudeSettingsEnvironment } from './claude-settings-environment'

const directories: string[] = []
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  )
})
async function settings(value: unknown): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'orca-claude-env-'))
  directories.push(directory)
  await writeFile(join(directory, 'settings.json'), JSON.stringify(value))
  return directory
}

it('references the original settings file and uses its environment over stale launch values', async () => {
  const directory = await settings({
    env: {
      ANTHROPIC_BASE_URL: 'https://gateway.company.internal',
      ANTHROPIC_AUTH_TOKEN: 'fixture-auth-value',
      ANTHROPIC_MODEL: 'company-model'
    }
  })
  expect(await withClaudeSettingsEnvironment({ PATH: '/fixture/bin' }, directory)).toMatchObject({
    ANTHROPIC_BASE_URL: 'https://gateway.company.internal',
    ANTHROPIC_AUTH_TOKEN: 'fixture-auth-value',
    ANTHROPIC_MODEL: 'company-model',
    PATH: '/fixture/bin'
  })
  expect(
    (await withClaudeSettingsEnvironment({ ANTHROPIC_MODEL: 'explicit-model' }, directory))
      .ANTHROPIC_MODEL
  ).toBe('company-model')
  expect((await claudeSettingsLaunch({}, directory)).settingsFile).toBe(
    join(directory, 'settings.json')
  )
})

it('uses only the selected configuration home and rereads changed settings for each launch', async () => {
  const first = await settings({
    env: { ANTHROPIC_AUTH_TOKEN: 'first-profile-value' },
    model: 'first-model'
  })
  const second = await settings({
    env: { ANTHROPIC_AUTH_TOKEN: 'second-profile-value' },
    model: 'second-model'
  })
  expect(await withClaudeSettingsEnvironment({}, second)).toEqual({
    ANTHROPIC_AUTH_TOKEN: 'second-profile-value',
    ANTHROPIC_MODEL: 'second-model'
  })
  await writeFile(
    join(first, 'settings.json'),
    JSON.stringify({ env: { ANTHROPIC_MODEL: 'changed-model' } })
  )
  expect(await withClaudeSettingsEnvironment({}, first)).toEqual({
    ANTHROPIC_MODEL: 'changed-model'
  })
})

it('does not expose config contents in parse failures', async () => {
  const directory = await settings({})
  await writeFile(
    join(directory, 'settings.json'),
    '{"env":{"ANTHROPIC_AUTH_TOKEN":"private-config-value"'
  )
  await expect(withClaudeSettingsEnvironment({}, directory)).rejects.toThrow(
    /^Claude settings.json could not be read or parsed\. Check the selected CLI configuration\.$/
  )
})

it('keeps the launch environment when no settings file exists', async () => {
  const directory = await settings({})
  await rm(join(directory, 'settings.json'))
  expect(
    await withClaudeSettingsEnvironment({ ANTHROPIC_MODEL: 'inherited-model' }, directory)
  ).toEqual({ ANTHROPIC_MODEL: 'inherited-model' })
})
