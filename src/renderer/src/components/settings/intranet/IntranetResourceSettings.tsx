import { useState } from 'react'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { createNonSecureContextUuid } from '../../../../../shared/identifiers/non-secure-context-uuid'
import {
  emptyIntranetResources,
  type IntranetResources
} from '../../../../../shared/intranet/intranet-resources'
import {
  IntranetSettingsSchema,
  type IntranetSettings
} from '../../../../../shared/intranet/intranet-settings'
import { intranetMcpConfig } from '../../../../../shared/intranet/intranet-mcp-config'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Textarea } from '../../ui/textarea'
import { Switch } from '../../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { IntranetMcpServerEditor } from './IntranetMcpServerEditor'
import { useTranslate } from '@/i18n/use-translate'
import { INTRANET_MCP_SETTINGS_TARGET_ID } from '../navigation/settings-navigation-types'

export function IntranetResourceSettings({
  settings,
  onChange
}: {
  settings: IntranetSettings
  onChange: (resources: IntranetResources) => void
}): React.JSX.Element {
  const t = useTranslate()
  const value = settings.resources ?? emptyIntranetResources()
  const [format, setFormat] = useState<'opencode' | 'claude'>('opencode')
  const [copyError, setCopyError] = useState('')
  const [copiedConfig, setCopiedConfig] = useState('')
  const parsed = IntranetSettingsSchema.safeParse(settings)
  const config = parsed.success
    ? JSON.stringify(intranetMcpConfig(parsed.data, format), null, 2)
    : ''
  const update = (patch: Partial<IntranetResources>): void => onChange({ ...value, ...patch })
  return (
    <>
      <div id={INTRANET_MCP_SETTINGS_TARGET_ID}>
        <SettingsGroup
          title={t('intranet.resources.mcpTitle', 'Company MCP servers')}
          description={t(
            'intranet.resources.mcpDescription',
            'Register internal tools and knowledge search servers. Enabled connections are passed to new OpenCode and Claude Code sessions.'
          )}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                update({
                  mcpServers: [
                    ...value.mcpServers,
                    {
                      id: `company-${createNonSecureContextUuid().slice(0, 8)}`,
                      name: '',
                      enabled: true,
                      purpose: 'tools',
                      transport: 'http',
                      url: '',
                      command: '',
                      args: [],
                      tokenEnv: ''
                    }
                  ]
                })
              }
            >
              <Plus className="size-4" />
              {t('intranet.resources.addServer', 'Add MCP server')}
            </Button>
          }
        >
          {value.mcpServers.map((server) => (
            <IntranetMcpServerEditor
              key={server.id}
              value={server}
              onChange={(next) =>
                update({
                  mcpServers: value.mcpServers.map((entry) =>
                    entry.id === server.id ? next : entry
                  )
                })
              }
              onRemove={() =>
                update({ mcpServers: value.mcpServers.filter((entry) => entry.id !== server.id) })
              }
            />
          ))}
          <p data-settings-row="" className="py-3 text-settings-detail text-muted-foreground">
            {t(
              'intranet.resources.mcpHelp',
              'Enter an environment variable name, not the token itself. Set its value on the host running the agent. Commands must already be installed there. Orca does not download packages. OAuth and custom authentication use the existing CLI configuration.'
            )}
          </p>
        </SettingsGroup>
      </div>
      <SettingsGroup
        title={t('intranet.resources.sourcesTitle', 'Company skills and documents')}
        description={t(
          'intranet.resources.sourcesDescription',
          'Expose skill guides and document folders through a read-only MCP bridge. Add a knowledge MCP server above for a wiki, RAG service or document platform.'
        )}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              update({
                sources: [
                  ...value.sources,
                  {
                    id: `source-${createNonSecureContextUuid().slice(0, 8)}`,
                    name: '',
                    kind: 'skills',
                    path: '',
                    enabled: true
                  }
                ]
              })
            }
          >
            <Plus className="size-4" />
            {t('intranet.resources.addSource', 'Add folder')}
          </Button>
        }
      >
        {value.sources.map((source) => {
          const edit = (patch: Partial<typeof source>): void =>
            update({
              sources: value.sources.map((entry) =>
                entry.id === source.id ? { ...entry, ...patch } : entry
              )
            })
          return (
            <div key={source.id} data-settings-row="" className="space-y-3 py-4">
              <div className="flex items-center gap-3">
                <span className="flex-1 truncate text-sm font-medium">
                  {source.name || t('intranet.resources.unnamedSource', 'New folder')}
                </span>
                <Switch
                  checked={source.enabled}
                  onCheckedChange={(enabled) => edit({ enabled })}
                  aria-label={t('intranet.resources.enabled', 'Enable connection')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('intranet.resources.removeSource', 'Remove folder')}
                  onClick={() =>
                    update({ sources: value.sources.filter((entry) => entry.id !== source.id) })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`${source.id}-name`}>
                    {t('intranet.resources.name', 'Connection name')}
                  </Label>
                  <Input
                    id={`${source.id}-name`}
                    value={source.name}
                    onChange={(event) => edit({ name: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('intranet.resources.sourceKind', 'Folder type')}</Label>
                  <Select
                    value={source.kind}
                    onValueChange={(kind) => edit({ kind: kind as typeof source.kind })}
                  >
                    <SelectTrigger aria-label={t('intranet.resources.sourceKind', 'Folder type')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skills">
                        {t('intranet.resources.skills', 'Skill guides (SKILL.md)')}
                      </SelectItem>
                      <SelectItem value="knowledge">
                        {t('intranet.resources.documents', 'Text documents')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${source.id}-path`}>
                  {t('intranet.resources.path', 'Folder path on the agent host')}
                </Label>
                <Input
                  id={`${source.id}-path`}
                  value={source.path}
                  onChange={(event) => edit({ path: event.target.value })}
                  className="font-mono"
                />
              </div>
            </div>
          )
        })}
        <div data-settings-row="" className="space-y-1.5 py-3">
          <Label htmlFor="intranet-resource-command">
            {t('intranet.resources.bridge', 'Orca CLI command on the agent host')}
          </Label>
          <Input
            id="intranet-resource-command"
            value={value.bridgeCommand}
            onChange={(event) => update({ bridgeCommand: event.target.value })}
            placeholder="orca"
            className="font-mono"
          />
        </div>
        <p data-settings-row="" className="py-3 text-settings-detail text-muted-foreground">
          {t(
            'intranet.resources.sourceHelp',
            'Folders are read on the host running the agent; use paths available on that SSH server for remote sessions. Skill guides are read through MCP, not installed or executed. Document search supports text, Markdown, JSON, YAML, CSV and HTML. PDF/Office and semantic search require a knowledge MCP server.'
          )}
        </p>
      </SettingsGroup>
      <SettingsGroup
        title={t('intranet.resources.exportTitle', 'Configuration for other clients')}
        description={t(
          'intranet.resources.exportHelp',
          'Preview the current form. Save below to apply it in Orca. For another terminal, merge this JSON into that client’s configuration and reconnect. An existing Claude --mcp-config argument takes precedence; merge these entries there.'
        )}
      >
        <div data-settings-row="" className="space-y-3 py-3">
          <Select
            value={format}
            onValueChange={(next) => {
              setFormat(next as typeof format)
              setCopiedConfig('')
            }}
          >
            <SelectTrigger
              aria-label={t('intranet.resources.client', 'Client configuration format')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="opencode">
                OpenCode {settings.opencode.configVersion === 'v2' ? '2.x' : '1.x'}
              </SelectItem>
              <SelectItem value="claude">Claude Code</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            aria-label={t('intranet.resources.preview', 'MCP configuration preview')}
            value={config}
            readOnly
            rows={8}
            className="font-mono text-xs"
          />
          {!config ? (
            <p role="status" className="text-settings-detail text-muted-foreground">
              {t(
                'intranet.resources.invalid',
                'Complete the connection names, addresses and paths to preview the configuration.'
              )}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!config}
            onClick={() => {
              void navigator.clipboard
                .writeText(config)
                .then(() => {
                  setCopiedConfig(config)
                  setCopyError('')
                })
                .catch((error: unknown) =>
                  setCopyError(error instanceof Error ? error.message : String(error))
                )
            }}
          >
            <Copy className="size-4" />
            {copiedConfig === config && config
              ? t('intranet.resources.copied', 'Copied')
              : t('intranet.resources.copy', 'Copy configuration')}
          </Button>
          {copyError ? (
            <p role="alert" className="text-settings-detail text-destructive">
              {copyError}
            </p>
          ) : null}
        </div>
      </SettingsGroup>
    </>
  )
}
