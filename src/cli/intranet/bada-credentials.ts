import type { RuntimeClient } from '../runtime/client'
import type { BadaCredentials } from '../../shared/intranet/intranet-sso'
import { badaCredentialsFromEnvironment } from '../../shared/intranet/bada-agent-credentials'

export async function readBadaCredentials(client: RuntimeClient): Promise<BadaCredentials> {
  try {
    return (await client.call<BadaCredentials>('intranet.ssoCredentials', {})).result
  } catch (error) {
    const unavailable =
      error instanceof Error &&
      error.message.includes('Company sign-in is available in the desktop app.')
    const credentials = unavailable ? badaCredentialsFromEnvironment(process.env) : null
    if (credentials) {
      return credentials
    }
    throw error
  }
}
