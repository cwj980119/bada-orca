import type { HandlerGroup } from '../dispatch/handler-group-manifest'

export const AUTH_HANDLER_GROUP: HandlerGroup = {
  name: 'auth',
  keys: ['auth login', 'auth status', 'auth logout', 'auth bada'],
  load: async () => ({
    ...(await import('./auth.js')).AUTH_HANDLERS,
    ...(await import('../intranet/bada-auth.js')).BADA_AUTH_HANDLERS
  })
}
