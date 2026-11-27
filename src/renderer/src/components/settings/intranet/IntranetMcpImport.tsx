import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTranslate } from '@/i18n/use-translate'
import { importIntranetMcpServers } from '../../../../../shared/intranet/intranet-mcp-import'
import type { IntranetMcpServer } from '../../../../../shared/intranet/intranet-resources'

export function IntranetMcpImport({
  servers,
  onImport
}: {
  servers: IntranetMcpServer[]
  onImport: (servers: IntranetMcpServer[]) => void
}): React.JSX.Element {
  const t = useTranslate()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [imported, setImported] = useState(false)
  return (
    <div data-settings-row="" className="space-y-3 py-3">
      <Label htmlFor="intranet-mcp-import">
        {t('intranet.resources.import', 'Import MCP configuration')}
      </Label>
      <p className="text-settings-detail text-muted-foreground">
        {t(
          'intranet.resources.importHelp',
          'Paste Claude, OpenCode JSON/JSONC or Codex TOML. Save once in Orca to apply connections to new agent sessions.'
        )}
      </p>
      <Textarea
        id="intranet-mcp-import"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setError('')
          setImported(false)
        }}
        rows={5}
        className="font-mono text-xs"
        spellCheck={false}
        placeholder='{"mcpServers":{"company":{"url":"https://mcp.company.internal/mcp"}}}'
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!text.trim()}
        onClick={() => {
          try {
            const incoming = importIntranetMcpServers(text)
            if (incoming.some((server) => servers.some((existing) => existing.id === server.id))) {
              throw new Error('같은 ID의 서버가 이미 있습니다. ID를 변경한 뒤 가져와 주세요.')
            }
            if (servers.length + incoming.length > 64) {
              throw new Error('MCP 서버는 최대 64개까지 등록할 수 있습니다.')
            }
            onImport([...servers, ...incoming])
            setText('')
            setError('')
            setImported(true)
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : '설정 형식을 확인해 주세요.')
          }
        }}
      >
        {t('intranet.resources.importAction', 'Add imported servers')}
      </Button>
      {error ? (
        <p role="alert" className="text-settings-detail text-destructive">
          {error}
        </p>
      ) : null}
      {imported ? (
        <p role="status" className="text-settings-detail text-muted-foreground">
          {t('intranet.resources.imported', 'Added to the form. Save connections below to apply.')}
        </p>
      ) : null}
    </div>
  )
}
