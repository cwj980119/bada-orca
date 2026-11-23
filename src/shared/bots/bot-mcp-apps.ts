// The vendors' own MCP servers that Add to <bot> lists. Each one passes the weekly app check
// (config/scripts/bot-apps); its README says how to add one.

export type BotAppCategory = 'coding' | 'chat' | 'monitoring' | 'docs' | 'mail' | 'sales' | 'design'

export type BotMcpApp = {
  /** The tool's name on the bot. */
  id: string
  name: string
  /** What the app does for the bot, before it is added. */
  line: string
  url: string
  /** browser: the server answers 401 and the bot's CLI signs in in a browser. none: no sign-in. */
  signIn: 'browser' | 'none'
  category: BotAppCategory
  /** The same app's slugs in Composio's catalog, so the Add dialog lists it once. */
  composio?: readonly string[]
}

export const BOT_MCP_APPS: readonly BotMcpApp[] = []
