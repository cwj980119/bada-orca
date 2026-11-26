type Delivery = { id: string; sessionId: string; run: () => Promise<void> }

export class BotGroupDeliveryQueue {
  private readonly pending: Delivery[] = []
  private readonly owned = new Set<string>()
  private readonly sessions = new Set<string>()

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
      const index = this.pending.findIndex((delivery) => !this.sessions.has(delivery.sessionId))
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
