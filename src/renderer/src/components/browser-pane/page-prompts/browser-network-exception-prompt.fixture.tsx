import { useEffect } from 'react'
import { getDefaultSettings } from '../../../../../shared/orca-profiles/constants'
import { defineFixture } from '../../../component-fixtures/component-fixture'
import { ConfirmationDialogProvider } from '../../dismiss/confirmation/confirmation-dialog'
import { useConfirmationDialog } from '../../dismiss/confirmation/confirmation-dialog-context'
import { networkExceptionPrompt } from './browser-network-exception-prompt'
import { setRendererUiLanguage } from '@/i18n/i18n'

function NetworkExceptionPreview(): React.JSX.Element {
  const confirm = useConfirmationDialog()
  useEffect(() => {
    const controller = new AbortController()
    void setRendererUiLanguage('ko').then(() =>
      networkExceptionPrompt.ask(
        confirm,
        { origin: 'https://uploads.example.com:8443', hostname: 'uploads.example.com' },
        controller.signal
      )
    )
    return () => controller.abort()
  }, [confirm])
  return <div className="h-96" />
}

export const approval = defineFixture({
  width: 720,
  store: { settings: { ...getDefaultSettings('/fixture'), uiLanguage: 'ko' } },
  render: () => (
    <ConfirmationDialogProvider>
      <NetworkExceptionPreview />
    </ConfirmationDialogProvider>
  )
})
