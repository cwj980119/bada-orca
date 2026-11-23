import { Trash2 } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Textarea } from '../../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Switch } from '../../ui/switch'
import { useTranslate } from '@/i18n/use-translate'
import type { IntranetMcpServer } from '../../../../../shared/intranet/intranet-resources'

export function IntranetMcpServerEditor({
  value,
  onChange,
  onRemove
}: {
  value: IntranetMcpServer
  onChange: (value: IntranetMcpServer) => void
  onRemove: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const edit = <K extends keyof IntranetMcpServer>(key: K, next: IntranetMcpServer[K]): void =>
    onChange({ ...value, [key]: next })
  return (
    <div data-settings-row="" className="space-y-3 py-4">
      <div className="flex items-center gap-3">
        <span className="flex-1 truncate text-sm font-medium">
          {value.name || t('intranet.resources.unnamedServer', 'New MCP server')}
        </span>
        <Switch
          checked={value.enabled}
          onCheckedChange={(enabled) => edit('enabled', enabled)}
          aria-label={t('intranet.resources.enabled', 'Enable connection')}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={t('intranet.resources.removeServer', 'Remove MCP server')}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${value.id}-name`}>
            {t('intranet.resources.name', 'Connection name')}
          </Label>
          <Input
            id={`${value.id}-name`}
            value={value.name}
            onChange={(event) => edit('name', event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('intranet.resources.purpose', 'Purpose')}</Label>
          <Select
            value={value.purpose}
            onValueChange={(next) => edit('purpose', next as IntranetMcpServer['purpose'])}
          >
            <SelectTrigger aria-label={t('intranet.resources.purpose', 'Purpose')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tools">
                {t('intranet.resources.tools', 'Business tools')}
              </SelectItem>
              <SelectItem value="knowledge">
                {t('intranet.resources.knowledge', 'Knowledge search')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{t('intranet.resources.transport', 'Connection method')}</Label>
          <Select
            value={value.transport}
            onValueChange={(next) => edit('transport', next as IntranetMcpServer['transport'])}
          >
            <SelectTrigger aria-label={t('intranet.resources.transport', 'Connection method')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="http">
                {t('intranet.resources.http', 'HTTP MCP server')}
              </SelectItem>
              <SelectItem value="stdio">
                {t('intranet.resources.stdio', 'Installed command (stdio)')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {value.transport === 'http' ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`${value.id}-url`}>
              {t('intranet.resources.url', 'MCP server URL')}
            </Label>
            <Input
              id={`${value.id}-url`}
              value={value.url}
              onChange={(event) => edit('url', event.target.value)}
              placeholder="https://mcp.company.internal/mcp"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${value.id}-token`}>
              {t('intranet.resources.token', 'Bearer token environment variable (optional)')}
            </Label>
            <Input
              id={`${value.id}-token`}
              value={value.tokenEnv}
              onChange={(event) => edit('tokenEnv', event.target.value)}
              placeholder="COMPANY_MCP_TOKEN"
              className="font-mono"
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`${value.id}-command`}>
              {t('intranet.resources.command', 'Executable path or command')}
            </Label>
            <Input
              id={`${value.id}-command`}
              value={value.command}
              onChange={(event) => edit('command', event.target.value)}
              placeholder="company-mcp"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${value.id}-args`}>
              {t('intranet.resources.args', 'Arguments (one per line, without shell quoting)')}
            </Label>
            <Textarea
              id={`${value.id}-args`}
              value={value.args.join('\n')}
              onChange={(event) => edit('args', event.target.value.split('\n'))}
              rows={3}
              className="font-mono"
            />
          </div>
        </>
      )}
      <p className="text-settings-detail text-muted-foreground">
        {t('intranet.resources.serverId', 'Connection ID: {{id}}', { id: value.id })}
      </p>
    </div>
  )
}
