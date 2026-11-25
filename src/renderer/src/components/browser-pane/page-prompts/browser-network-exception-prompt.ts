import { toast } from 'sonner'
import type { BrowserPagePromptHandler } from './browser-page-prompts'
import { translate } from '@/i18n/i18n'

export const networkExceptionPrompt: BrowserPagePromptHandler<'network-exception'> = {
  ask: async (confirm, { origin, hostname }, signal) => {
    const allowed = await confirm({
      signal,
      surface: 'security',
      title: translate('intranet.networkException.title', 'Allow external data transfer?'),
      description: translate(
        'intranet.networkException.description',
        'A request to {{origin}} is on hold. Adding {{hostname}} to the exception list allows this request and future Orca data transfers to this hostname. This applies to all ports and paths on this host, not other subdomains.',
        { origin, hostname }
      ),
      confirmLabel: translate('intranet.networkException.allow', 'Add exception and allow'),
      cancelLabel: translate('intranet.networkException.block', 'Keep blocked'),
      ignoresOpeningGesture: true
    })
    return allowed ? 'allow' : null
  },
  onFailed: ({ hostname }) =>
    toast.error(
      translate(
        'intranet.networkException.failed',
        'Could not save the exception for {{hostname}}.',
        {
          hostname
        }
      )
    )
}
