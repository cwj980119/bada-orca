import { expect, it } from 'vitest'
import { agentPickerModels } from './agent-launch-picker-catalog'

it('offers no public seed models before the company catalog is loaded and then offers its registered model', () => {
  expect(agentPickerModels({ agent: 'codex', catalog: { origin: 'unknown' } }, 'chat')).toEqual([])
  expect(agentPickerModels({ agent: 'codex', catalog: { origin: 'unknown' } }, 'terminal')).toEqual(
    []
  )
  const models = agentPickerModels(
    {
      agent: 'codex',
      catalog: {
        origin: 'probe',
        models: [{ id: 'company-coder', label: 'Company coder', isDefault: true, efforts: [] }],
        fetchedAt: 1
      }
    },
    'chat'
  )
  expect(models.map((model) => model.id)).toEqual(['company-coder'])
})
