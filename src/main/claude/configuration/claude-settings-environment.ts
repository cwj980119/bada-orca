import { join } from 'node:path'
import {
  openLocalRegularFile,
  readLocalFileBounded
} from '../../filesystem/local-file-io/local-regular-file-read'
import { isENOENT } from '../../filesystem/local-file-io/filesystem-path-containment'
import { isRecord } from '../../../shared/agent-status/child-work/agent-status-child-work-value-guards'
import { overlayEnvironmentVariables } from '../../../shared/shell/launch/environment-overlay'

export async function withClaudeSettingsEnvironment(
  environment: Record<string, string>,
  configDirectory: string
): Promise<Record<string, string>> {
  const settings = await readSettings(configDirectory)
  const values = isRecord(settings.env) ? settings.env : {}
  const configured = Object.fromEntries(
    Object.entries(values)
      .filter(
        ([key, value]) =>
          /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) &&
          typeof value === 'string' &&
          value.length <= 32768 &&
          !value.includes('\0')
      )
      .map(([key, value]) => [key, String(value)])
  )
  if (!configured.ANTHROPIC_MODEL && typeof settings.model === 'string' && settings.model.trim()) {
    configured.ANTHROPIC_MODEL = settings.model.trim()
  }
  return overlayEnvironmentVariables(configured, environment, process.platform)
}

async function readSettings(directory: string): Promise<Record<string, unknown>> {
  try {
    const { handle, stats } = await openLocalRegularFile(join(directory, 'settings.json'))
    try {
      const data: unknown = JSON.parse(
        (await readLocalFileBounded(handle, 1024 * 1024, stats.size)).toString('utf8')
      )
      if (!isRecord(data)) {
        throw new Error('Invalid settings')
      }
      return data
    } finally {
      await handle.close()
    }
  } catch (error) {
    if (isENOENT(error)) {
      return {}
    }
    throw new Error(
      'Claude settings.json could not be read or parsed. Check the selected CLI configuration.'
    )
  }
}
