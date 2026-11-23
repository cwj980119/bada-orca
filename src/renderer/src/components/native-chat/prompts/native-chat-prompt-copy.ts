import type { Translate } from '@/i18n/use-translate'

export function nativeChatPromptCopy(value: string, t: Translate): string {
  if (value.startsWith('Write access: ')) {
    return t('components.native-chat.prompt.writeAccess', 'Write access: {{path}}', {
      path: value.slice('Write access: '.length)
    })
  }
  switch (value) {
    case 'Stop':
      return t('components.native-chat.prompt.stop', 'Stop')
    case 'Cancel':
      return t('components.native-chat.prompt.cancel', 'Cancel')
    case 'Continue':
      return t('components.native-chat.prompt.continue', 'Continue')
    case 'Allow':
      return t('components.native-chat.prompt.allow', 'Allow')
    case 'Allow once':
      return t('components.native-chat.prompt.allowOnce', 'Allow once')
    case 'Allow for this session':
      return t('components.native-chat.prompt.allowSession', 'Allow for this session')
    case 'Always allow':
      return t('components.native-chat.prompt.alwaysAllow', 'Always allow')
    case 'Deny':
      return t('components.native-chat.prompt.deny', 'Deny')
    case 'Reject all':
      return t('components.native-chat.prompt.rejectAll', 'Reject all')
    case 'Approve plan':
      return t('components.native-chat.prompt.approvePlan', 'Approve plan')
    case 'Keep planning':
      return t('components.native-chat.prompt.keepPlanning', 'Keep planning')
    case 'Apply file changes?':
      return t('components.native-chat.prompt.applyChanges', 'Apply file changes?')
    case 'Yes':
      return t('components.native-chat.prompt.yes', 'Yes')
    case 'No':
      return t('components.native-chat.prompt.no', 'No')
    default:
      return value
  }
}
