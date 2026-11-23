import type { IntranetSettings, IntranetOpenCodeModel } from './intranet-settings'

export function intranetOpenCodeModels(
  settings: IntranetSettings['opencode']
): IntranetOpenCodeModel[] {
  return settings.models.length
    ? settings.models
    : settings.model
      ? [{ id: settings.model, name: '', purpose: '' }]
      : []
}

export function intranetOpenCodeModelReference(
  settings: IntranetSettings['opencode'],
  id: string
): string {
  return settings.baseUrl ? `internal/${id}` : id
}

export function intranetOpenCodeDefaultModel(settings: IntranetSettings['opencode']): string {
  const id = settings.model || intranetOpenCodeModels(settings)[0]?.id
  return id ? intranetOpenCodeModelReference(settings, id) : ''
}

export function intranetOpenCodeModelLabel(model: IntranetOpenCodeModel): string {
  const name = model.name || model.id
  return model.purpose ? `${name} · ${model.purpose}` : name
}
