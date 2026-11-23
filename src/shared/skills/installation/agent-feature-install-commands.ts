export const SKILLS_CLI_VERSION = '1.7.2'

export type AgentFeatureSkillCommandOptions = {
  sourceCommit: string
  global?: boolean
}

export function buildAgentFeatureSkillInstallArgs(
  _skillNames: readonly string[],
  _options: AgentFeatureSkillCommandOptions
): string[] {
  throw new Error('This service is not included in the internal edition.')
}

export function buildAgentFeatureSkillInstallCommand(
  _skillNames: readonly string[],
  _options: AgentFeatureSkillCommandOptions
): string {
  return ''
}
