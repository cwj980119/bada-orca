import { defineFixture } from '../../../../component-fixtures/component-fixture'
import { setRendererUiLanguage } from '@/i18n/i18n'
import { IntranetSsoSettings } from './IntranetSsoSettings'
import {
  defaultIntranetSsoSettings,
  type IntranetSsoStatus
} from '../../../../../../shared/intranet/intranet-sso'

const configured = {
  ...defaultIntranetSsoSettings(),
  enabled: true,
  label: '사내 인증',
  issuer: 'https://sso.company.internal',
  clientId: 'desktop-client'
}
function setup(status: IntranetSsoStatus): void {
  void setRendererUiLanguage('ko')
  const original = window.api.runtime.call
  window.api.runtime.call = async (request) =>
    request.method.startsWith('intranet.sso')
      ? { id: 'fixture', ok: true, result: status, _meta: { runtimeId: 'fixture' } }
      : original(request)
}
const signedOut: IntranetSsoStatus = {
  state: 'signed-out',
  identity: null,
  persistence: 'memory',
  error: null
}

export const unconfigured = defineFixture({
  width: 720,
  setup: () => setup({ ...signedOut, state: 'unconfigured' }),
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <IntranetSsoSettings value={undefined} savedValue={undefined} onChange={() => {}} />
    </div>
  )
})
export const oidc = defineFixture({
  width: 720,
  setup: () => setup(signedOut),
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <IntranetSsoSettings value={configured} savedValue={configured} onChange={() => {}} />
    </div>
  )
})
export const connected = defineFixture({
  width: 720,
  setup: () =>
    setup({
      state: 'signed-in',
      identity: {
        issuer: configured.issuer,
        subject: 'employee-7',
        name: '홍길동',
        email: 'employee@company.internal',
        expiresAt: Date.now() + 5 * 60_000
      },
      persistence: 'encrypted',
      error: null
    }),
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <IntranetSsoSettings value={configured} savedValue={configured} onChange={() => {}} />
    </div>
  )
})
export const oauth2 = defineFixture({
  width: 720,
  setup: () => setup(signedOut),
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <IntranetSsoSettings
        value={{
          ...configured,
          protocol: 'oauth2',
          authorizationUrl: 'https://sso.company.internal/authorize',
          tokenUrl: 'https://sso.company.internal/token',
          userInfoUrl: 'https://sso.company.internal/userinfo',
          subjectClaim: 'uid',
          scopes: 'profile'
        }}
        savedValue={configured}
        onChange={() => {}}
      />
    </div>
  )
})
export const narrow = defineFixture({
  width: 420,
  setup: () => setup(signedOut),
  render: () => (
    <div className="settings-view-shell bg-background p-4">
      <IntranetSsoSettings value={configured} savedValue={configured} onChange={() => {}} />
    </div>
  )
})
