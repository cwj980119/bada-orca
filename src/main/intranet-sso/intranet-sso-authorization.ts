import { createHash, randomBytes } from 'node:crypto'
import {
  INTRANET_SSO_CALLBACK_PATH,
  intranetSsoCallbackPort,
  type IntranetSsoSettings,
  type IntranetSsoSession
} from '../../shared/intranet/intranet-sso'
import { serveHeldLoopbackCallback } from '../orca-profiles/cloud-auth/loopback-callback'
import {
  orcaCallbackReceivedPage,
  orcaCallbackOutcome
} from '../orca-profiles/cloud-auth/profile-cloud-callback-page'
import { IntranetSsoError, IntranetSsoProviderClient } from './intranet-sso-provider'
import { ssoConfigurationKey } from './intranet-sso-session'

type AuthorizationPorts = {
  provider?: IntranetSsoProviderClient
  openBrowser(url: string): Promise<void>
  configurationKey(): string
  persist(session: IntranetSsoSession): void
}

const PAGE = orcaCallbackReceivedPage({
  brand: 'ORCA · BADA',
  heading: '로그인을 마무리하고 있어요',
  line: '계정 정보를 확인하는 동안 잠시만 기다려 주세요.'
})
const SUCCESS = orcaCallbackOutcome({
  ok: true,
  brand: 'ORCA · BADA',
  heading: 'BADA 로그인 완료',
  line: '이제 Orca 앱으로 돌아가 작업을 이어가세요. 이 창은 닫아도 괜찮습니다.'
})
const FAILED = orcaCallbackOutcome({
  ok: false,
  brand: 'ORCA · BADA',
  heading: '로그인을 완료하지 못했어요',
  line: 'Orca 앱으로 돌아가 BADA 로그인을 다시 시도해 주세요.'
})

export async function authorizeIntranetSso(
  ports: AuthorizationPorts,
  config: IntranetSsoSettings,
  signal: AbortSignal,
  clientSecret?: string
): Promise<IntranetSsoSession> {
  const providerClient = ports.provider ?? new IntranetSsoProviderClient()
  providerClient.assertCredentials(config, clientSecret)
  const provider = await providerClient.discover(config, signal)
  const verifier = randomBytes(32).toString('base64url')
  const state = randomBytes(32).toString('base64url')
  const nonce = randomBytes(32).toString('base64url')
  let redirectUri = ''
  const returned = await serveHeldLoopbackCallback<string>({
    path: INTRANET_SSO_CALLBACK_PATH,
    rejectedPage: PAGE + FAILED,
    port: intranetSsoCallbackPort(config.callbackPort),
    timeoutMs: 5 * 60_000,
    signal,
    errors: {
      timeout: 'timeout',
      cancelled: 'cancelled',
      unavailable: 'callback_unavailable',
      failed: 'callback_failed'
    },
    hold: { received: PAGE, pending: FAILED, ms: 45_000 },
    read: (url) => {
      if (
        url.searchParams.getAll('state').length !== 1 ||
        url.searchParams.get('state') !== state
      ) {
        return { kind: 'stray', message: 'Invalid sign-in state.' }
      }
      if (url.searchParams.has('iss') && url.searchParams.get('iss') !== provider.issuer) {
        return {
          kind: 'reject',
          error: new IntranetSsoError('invalid_issuer'),
          message: 'Invalid issuer.'
        }
      }
      if (url.searchParams.has('error')) {
        return {
          kind: 'reject',
          error: new IntranetSsoError(
            url.searchParams.get('error') === 'access_denied' ? 'denied' : 'sign_in_failed'
          ),
          message: 'Sign-in was not completed. Return to the app.'
        }
      }
      const code = url.searchParams.get('code')
      if (!code || code.length > 4096 || url.searchParams.getAll('code').length !== 1) {
        return { kind: 'stray', message: 'Missing authorization code.' }
      }
      return { kind: 'accept', value: code }
    },
    onListening: async (port) => {
      redirectUri = `http://127.0.0.1:${port}${INTRANET_SSO_CALLBACK_PATH}`
      const url = new URL(provider.authorizationUrl)
      for (const [key, value] of Object.entries({
        client_id: config.clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: config.scopes,
        state,
        nonce,
        code_challenge: createHash('sha256').update(verifier).digest('base64url'),
        code_challenge_method: 'S256'
      })) {
        url.searchParams.set(key, value)
      }
      if (config.scopes.split(/\s+/).includes('offline_access')) {
        url.searchParams.set('prompt', 'consent')
      }
      await ports.openBrowser(url.href)
    }
  })
  try {
    const exchanged = await providerClient.exchange(
      config,
      provider,
      { code: returned.value, verifier, nonce, redirectUri, clientSecret },
      signal
    )
    const session = {
      ...exchanged,
      ...(config.tokenEndpointAuthMethod !== 'none' && clientSecret ? { clientSecret } : {})
    }
    if (signal.aborted || ports.configurationKey() !== ssoConfigurationKey(config)) {
      throw new IntranetSsoError('cancelled')
    }
    ports.persist(session)
    returned.answer(SUCCESS)
    return session
  } catch (error) {
    returned.answer(FAILED)
    throw error
  }
}
