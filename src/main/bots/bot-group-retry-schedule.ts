/** One timer per runtime; delayed retries release the native delivery slots. */
export class BotGroupRetrySchedule {
  private readonly pending = new Map<string, { at: number; run: () => void }>()
  private timer: ReturnType<typeof setTimeout> | undefined

  schedule(id: string, at: number, run: () => void): void {
    this.pending.set(id, { at, run })
    this.arm()
  }

  private arm(): void {
    clearTimeout(this.timer)
    if (!this.pending.size) {
      return
    }
    const at = Math.min(...[...this.pending.values()].map((item) => item.at))
    this.timer = setTimeout(
      () => {
        for (const [id, item] of this.pending) {
          if (item.at <= Date.now()) {
            this.pending.delete(id)
            try {
              item.run()
            } catch (error) {
              console.warn('[bot-groups] recovery stopped', error)
            }
          }
        }
        this.arm()
      },
      Math.max(0, at - Date.now())
    )
    this.timer.unref?.()
  }
}
