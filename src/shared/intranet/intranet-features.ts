export const EXTERNAL_SERVICES_ENABLED: boolean = false
export const REMOTE_CLIENTS_ENABLED: boolean = false

const REMOVED_SETTINGS = new Set([
  'orca-account',
  'accounts',
  'integrations',
  'linear',
  'mobile',
  'servers',
  'artifacts',
  'share-skills',
  'shared-links',
  'tasks',
  'plugins',
  'voice',
  'mobile-emulator',
  'setup-guide',
  'privacy',
  'dev',
  'experimental'
])

export function isIntranetSettingsSection(id: string): boolean {
  return !REMOVED_SETTINGS.has(id)
}

export function isIntranetAgent(agent: string): boolean {
  return agent === 'opencode' || agent === 'opencode2' || agent === 'claude' || agent === 'codex'
}

export function isIntranetSlashCommand(name: string): boolean {
  return ![
    'login',
    'logout',
    'connect',
    'share',
    'unshare',
    'publish',
    'feedback',
    'bug',
    'usage',
    'plugins',
    'upgrade',
    'update'
  ].includes(name.toLowerCase())
}

export function isIntranetRpcMethod(name: string): boolean {
  return (
    ![
      'pairing.',
      'mobileRelay.',
      'mobileWeb.',
      'orcaAccount.',
      'connector.',
      'bots.composio.',
      'bots.connect',
      'bots.slack.',
      'bots.linear.',
      'bots.github.',
      'bots.google',
      'bots.share',
      'bots.import',
      'bots.templates',
      'bots.tools.',
      'artifacts.',
      'managedRuntime.',
      'linear.',
      'jira.',
      'agentCliUpdate.',
      'updater.'
    ].some((prefix) => name.startsWith(prefix)) &&
    ![
      'skills.share',
      'plugins.catalogAdd',
      'plugins.install',
      'usage.call',
      'agentSession.accountUsage'
    ].includes(name) &&
    !(name.startsWith('accounts.') && /signIn/i.test(name))
  )
}
