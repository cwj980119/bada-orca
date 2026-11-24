import { useState } from 'react'
import { Plug } from 'lucide-react'
import { INTRANET_MCP_SETTINGS_TARGET_ID } from '../navigation/settings-navigation-types'
import { scrollSubsectionIntoView } from '../navigation/settings-navigation-foundations'
import { Button } from '../../ui/button'
import { Label } from '../../ui/label'
import { Textarea } from '../../ui/textarea'
import { OpenCodeModelSettings } from './OpenCodeModelSettings'
import { CodexModelSettings } from './CodexModelSettings'
import { IntranetResourceSettings } from './IntranetResourceSettings'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { IntranetSsoSettings } from './sso/IntranetSsoSettings'
import { ssoSettingError } from './sso/sso-setting-errors'
import { SshClaudeDiagnostic } from './SshClaudeDiagnostic'
import { LocalClaudeConfiguration } from './LocalClaudeConfiguration'
import { useTranslate } from '@/i18n/use-translate'
import {
  IntranetSettingsSchema,
  readIntranetSettings,
  type IntranetSettings
} from '../../../../../shared/intranet/intranet-settings'

export function IntranetSettingsPane({
  settings,
  save,
  externalConnections
}: {
  settings: unknown
  externalConnections?: React.ReactNode
  save: (settings: IntranetSettings) => Promise<unknown>
}): React.JSX.Element {
  const t = useTranslate()
  const [draft, setDraft] = useState(() => readIntranetSettings(settings))
  const [hosts, setHosts] = useState(() => readIntranetSettings(settings).allowedHosts.join('\n'))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const submit = async (): Promise<void> => {
    setSaved(false)
    setError('')
    const parsed = IntranetSettingsSchema.safeParse({
      ...draft,
      allowedHosts: hosts
        .split(/[\n,]/)
        .map((host) => host.trim())
        .filter(Boolean)
    })
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((issue) =>
            issue.path[0] === 'sso'
              ? ssoSettingError(issue, t)
              : `${issue.path.join('.')}: ${issue.message}`
          )
          .join('\n')
      )
      return
    }
    setSaving(true)
    try {
      await save(parsed.data)
      setSaved(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
  }
  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault()
        if (!saving) {
          void submit()
        }
      }}
    >
      <IntranetSsoSettings />
      <SettingsGroup
        title={t('intranet.resources.mcpShortcutTitle', 'MCP server settings')}
        description={t(
          'intranet.resources.mcpShortcutHelp',
          'Add and manage company tools and knowledge search servers.'
        )}
        action={
          <Button asChild variant="outline" size="sm">
            <a
              href={`#${INTRANET_MCP_SETTINGS_TARGET_ID}`}
              onClick={(event) => {
                event.preventDefault()
                scrollSubsectionIntoView(INTRANET_MCP_SETTINGS_TARGET_ID)
              }}
            >
              <Plug className="size-4" />
              {t('intranet.resources.manageMcp', 'Manage MCP servers')}
            </a>
          </Button>
        }
      >
        <p data-settings-row="" className="py-3 text-settings-detail text-muted-foreground">
          {t(
            'intranet.resources.serverSummary',
            '{{registered}} registered · {{enabled}} enabled',
            {
              registered: draft.resources?.mcpServers.length ?? 0,
              enabled: draft.resources?.mcpServers.filter((server) => server.enabled).length ?? 0
            }
          )}
        </p>
      </SettingsGroup>
      <SettingsGroup
        title={t('intranet.network', 'Internal servers')}
        description={t(
          'intranet.networkDescription',
          'Only local, private IP addresses and the servers configured here are allowed. Model and enabled MCP endpoints below are allowed automatically.'
        )}
      >
        <div data-settings-row="" className="space-y-2 py-4">
          <Label htmlFor="intranet-hosts">
            {t('intranet.allowedHosts', 'Allowed hostnames, IP addresses and IPv4 ranges')}
          </Label>
          <Textarea
            id="intranet-hosts"
            value={hosts}
            onChange={(event) => {
              setHosts(event.target.value)
              setSaved(false)
            }}
            placeholder={'git.company.internal\n10.20.0.0/16'}
            className="font-mono"
            rows={4}
          />
          <p className="text-settings-detail text-muted-foreground">
            {t(
              'intranet.hostsHelp',
              'One entry per line. Use hostnames without a scheme or path. This applies to connections made by Orca. CLI tools retain their own network configuration.'
            )}
          </p>
        </div>
      </SettingsGroup>
      <OpenCodeModelSettings
        value={draft.opencode}
        onChange={(opencode) => {
          setDraft((current) => ({ ...current, opencode }))
          setSaved(false)
        }}
      />
      <LocalClaudeConfiguration />
      <SshClaudeDiagnostic />
      <CodexModelSettings
        value={draft.cliModels?.codex ?? { model: '', models: [] }}
        onChange={({ model, models }) => {
          setDraft((current) => ({
            ...current,
            cliModels: { ...current.cliModels, codex: { model, models } }
          }))
          setSaved(false)
        }}
      />
      <IntranetResourceSettings
        settings={draft}
        onChange={(resources) => {
          setDraft((current) => ({ ...current, resources }))
          setSaved(false)
        }}
      />
      {externalConnections}
      <p className="text-settings-detail text-muted-foreground">
        {t(
          'intranet.applyHelp',
          'Model and tool changes apply to new agent sessions. Company SSO connects the app account separately. No Orca account is required. Automatic updates, telemetry and public sharing remain disabled.'
        )}
      </p>
      {error ? (
        <p role="alert" className="whitespace-pre-wrap text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? t('intranet.saving', 'Saving…') : t('intranet.save', 'Save connections')}
        </Button>
        {saved ? (
          <p role="status" className="text-sm text-muted-foreground">
            {t('intranet.saved', 'Saved. Start a new agent session to use these settings.')}
          </p>
        ) : null}
      </div>
    </form>
  )
}
