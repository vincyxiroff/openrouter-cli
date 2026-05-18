export type EventHandler<TPayload = unknown> = (payload: TPayload) => void | Promise<void>;

export class EventBus<TEvents extends Record<string, unknown> = Record<string, unknown>> {
  private readonly handlers = new Map<keyof TEvents, Set<EventHandler>>();

  on<TKey extends keyof TEvents>(event: TKey, handler: EventHandler<TEvents[TKey]>): () => void {
    const handlers = this.handlers.get(event) ?? new Set<EventHandler>();
    handlers.add(handler as EventHandler);
    this.handlers.set(event, handlers);
    return () => handlers.delete(handler as EventHandler);
  }

  async emit<TKey extends keyof TEvents>(event: TKey, payload: TEvents[TKey]): Promise<void> {
    const handlers = this.handlers.get(event) ?? new Set<EventHandler>();

    for (const handler of handlers) {
      await handler(payload);
    }
  }
}
