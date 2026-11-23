import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { ORCA_LINEAR_SKILL_NAME } from '../../skills/installation/agent-feature-skill-names'
import type { SkillUsageExample } from '../../skills/examples/skill-usage-example'

const LINEAR_SLASH_COMMAND = `/${ORCA_LINEAR_SKILL_NAME}`

export const getLinearUsageExamples = createLocalizedCatalog((t): SkillUsageExample[] => [
  {
    id: 'read-ticket',
    title: t('auto.lib.linear.usage.examples.readTicket', 'Read the linked ticket'),
    summary: t(
      'auto.lib.linear.usage.examples.readTicketSummary',
      "Pull the linked Linear issue's full context before starting work."
    ),
    prompt: t(
      'auto.lib.linear.usage.examples.readTicketPrompt',
      'Use {{value0}} to read the linked Linear issue for this worktree, then summarize the goal and acceptance criteria before you start.',
      { value0: LINEAR_SLASH_COMMAND }
    )
  },
  {
    id: 'post-update',
    title: t('auto.lib.linear.usage.examples.postUpdate', 'Post a progress update'),
    summary: t(
      'auto.lib.linear.usage.examples.postUpdateSummary',
      'Comment progress or a completion summary back to the Linear issue.'
    ),
    prompt: t(
      'auto.lib.linear.usage.examples.postUpdatePrompt',
      'Use {{value0}} to post a completion update on the linked Linear issue with what changed and how it was verified.',
      { value0: LINEAR_SLASH_COMMAND }
    )
  },
  {
    id: 'move-state',
    title: t('auto.lib.linear.usage.examples.moveState', 'Move the ticket forward'),
    summary: t(
      'auto.lib.linear.usage.examples.moveStateSummary',
      'Advance the Linear workflow state as the work progresses.'
    ),
    prompt: t(
      'auto.lib.linear.usage.examples.moveStatePrompt',
      'Use {{value0}} to move the linked Linear issue to In Review now that the change is ready.',
      { value0: LINEAR_SLASH_COMMAND }
    )
  },
  {
    id: 'attach-pr',
    title: t('auto.lib.linear.usage.examples.attachPr', 'Attach the review link'),
    summary: t(
      'auto.lib.linear.usage.examples.attachPrSummary',
      'Link the pull or merge request to the Linear issue when you open it.'
    ),
    prompt: t(
      'auto.lib.linear.usage.examples.attachPrPrompt',
      'Use {{value0}} to attach this pull or merge request to the linked Linear issue.',
      { value0: LINEAR_SLASH_COMMAND }
    )
  },
  {
    id: 'triage-followups',
    title: t('auto.lib.linear.usage.examples.triageFollowups', 'Triage and create follow-ups'),
    summary: t(
      'auto.lib.linear.usage.examples.triageFollowupsSummary',
      'Set assignee, priority, or estimate, and file parented follow-up tickets.'
    ),
    prompt: t(
      'auto.lib.linear.usage.examples.triageFollowupsPrompt',
      'Use {{value0}} to triage the linked Linear issue — set priority and estimate — and create a parented follow-up ticket for the deferred cleanup.',
      { value0: LINEAR_SLASH_COMMAND }
    )
  }
])
