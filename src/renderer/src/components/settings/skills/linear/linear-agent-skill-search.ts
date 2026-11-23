import { translateSearchKeyword } from '../../search/settings-search-keywords'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'

export const getLinearAgentSkillPaneSearchEntries = createLocalizedCatalog((t) => [
  {
    title: t('auto.components.settings.linear.agent.skill.search.title', 'Linear'),
    description: t(
      'auto.components.settings.linear.agent.skill.search.description',
      'Linear skill status, usage examples, and links to Task Sources setup.'
    ),
    keywords: [
      ...translateSearchKeyword(
        'auto.components.settings.linear.agent.skill.search.linear',
        'linear'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.linear.agent.skill.search.tickets',
        'tickets'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.linear.agent.skill.search.issues',
        'issues'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.linear.agent.skill.search.skill',
        'skill'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.linear.agent.skill.search.orcaLinear',
        'orca-linear'
      )
    ]
  }
])
