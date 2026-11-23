import { openBotHomeTab } from '@/lib/bot-catalog'
import { useAppStore } from '@/store'
import { BOTS_GROUP_KEY } from '../../../../shared/sidebar-list/sections/group-keys'
import type { Bot } from '../../../../shared/bot-types'

/** Opens a bot just created and shows its row; false, with a toast, when its page could not open yet. */
export async function openCreatedBot(bot: Bot): Promise<boolean> {
  const opened = await openBotHomeTab(bot)
  if (opened) {
    // The new bot's row must be visible, from any entry point.
    const { collapsedGroups, toggleCollapsedGroup } = useAppStore.getState()
    if (collapsedGroups.has(BOTS_GROUP_KEY)) {
      toggleCollapsedGroup(BOTS_GROUP_KEY)
    }
  }
  return opened
}
