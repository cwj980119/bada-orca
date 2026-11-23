import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { useTranslate } from '@/i18n/use-translate'

export function SshClaudeConnectionFields({
  destination,
  password,
  disabled,
  onDestinationChange,
  onPasswordChange
}: {
  destination: string
  password: string
  disabled: boolean
  onDestinationChange: (value: string) => void
  onPasswordChange: (value: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="ssh-claude-destination">
          {t('intranet.sshClaude.destination', 'SSH alias or user@host')}
        </Label>
        <Input
          id="ssh-claude-destination"
          value={destination}
          disabled={disabled}
          placeholder={t('intranet.sshClaude.destinationPlaceholder', 'company-linux')}
          autoComplete="off"
          onChange={(event) => onDestinationChange(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ssh-claude-password">
          {t('intranet.sshClaude.password', 'SSH password (optional)')}
        </Label>
        <Input
          id="ssh-claude-password"
          type="password"
          value={password}
          disabled={disabled}
          autoComplete="off"
          maxLength={1024}
          aria-describedby="ssh-claude-password-help"
          onChange={(event) => onPasswordChange(event.target.value)}
        />
        <p id="ssh-claude-password-help" className="text-settings-detail text-muted-foreground">
          {t(
            'intranet.sshClaude.passwordHelp',
            'Leave blank to use existing keys or SSO. Used only for this test; cleared when it starts and never saved or copied into results. Additional OTP prompts and jump-host passwords are not supported.'
          )}
        </p>
      </div>
    </>
  )
}
