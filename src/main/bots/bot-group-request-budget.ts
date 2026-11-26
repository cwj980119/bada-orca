import type { BotGroupRuntime } from './bot-group-runtime'

/** Legacy posts have no budget; new human posts own a bounded peer conversation. */
export function assertGroupRequestBudget(groups: BotGroupRuntime, rootId: string): void {
  const root = groups.store.message(rootId)
  if (!root) {
    return
  }
  if (root.deadlineAt !== undefined && Date.now() >= root.deadlineAt) {
    throw new Error('This group conversation expired. Send a new human message to continue.')
  }
  if (root.peerTurnLimit !== undefined) {
    if ((root.peerTurnsUsed ?? 0) >= root.peerTurnLimit) {
      throw new Error(
        'This group conversation reached its peer delivery limit. Send a new human message to continue.'
      )
    }
  }
}

export function consumeGroupRequestBudget(groups: BotGroupRuntime, rootId: string): void {
  assertGroupRequestBudget(groups, rootId)
  const root = groups.store.message(rootId)
  if (root?.peerTurnLimit !== undefined) {
    groups.store.update({ ...root, peerTurnsUsed: (root.peerTurnsUsed ?? 0) + 1 })
  }
}
