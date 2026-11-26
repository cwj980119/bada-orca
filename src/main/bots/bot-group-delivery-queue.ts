type Delivery = { id: string; sessionId: string; run: () => Promise<void> }

export class BotGroupDeliveryQueue {
  private readonly pending: Delivery[] = []
  private readonly owned = new Set<string>()
  private readonly sessions = new Set<string>()
  private readonly blocked = new Map<string, string>()

  hold(sessionId: string, operationId: string): void {
    if (!this.blocked.has(sessionId)) {
      this.blocked.set(sessionId, operationId)
    }
  }

  release(sessionId: string, operationId?: string): void {
    if (operationId === undefined || this.blocked.get(sessionId) === operationId) {
      this.blocked.delete(sessionId)
      this.drain()
    }
  }

  enqueue(delivery: Delivery): void {
    if (this.owned.has(delivery.id)) {
      return
    }
    this.owned.add(delivery.id)
    this.pending.push(delivery)
    this.drain()
  }

  private drain(): void {
    while (this.sessions.size < 4) {
      const index = this.pending.findIndex(
        (delivery) =>
          !this.sessions.has(delivery.sessionId) &&
          (!this.blocked.has(delivery.sessionId) ||
            this.blocked.get(delivery.sessionId) === delivery.id)
      )
      if (index === -1) {
        return
      }
      const [delivery] = this.pending.splice(index, 1)
      this.sessions.add(delivery.sessionId)
      void Promise.resolve()
        .then(delivery.run)
        .catch((error: unknown) => console.warn('[bot-groups] delivery failed', error))
        .finally(() => {
          this.sessions.delete(delivery.sessionId)
          this.owned.delete(delivery.id)
          this.drain()
        })
    }
  }
}
