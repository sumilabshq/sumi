type Start = (tell: () => void) => () => void;

interface Listener {
	readonly heard: () => void;
}

interface Subscription {
	readonly listeners: Set<Listener>;
	readonly stop: () => void;
}

export class SharedSubscriptions {
	private readonly held = new Map<string, Subscription>();

	join(key: string, start: Start, heard: () => void): () => void {
		const subscription = this.held.get(key) ?? this.started(key, start);
		const listener = { heard };
		subscription.listeners.add(listener);
		return () => this.leave(key, subscription, listener);
	}

	isJoined(key: string): boolean {
		return this.held.has(key);
	}

	tell(key: string): void {
		const subscription = this.held.get(key);
		if (subscription !== undefined) tellAll(subscription.listeners);
	}

	private started(key: string, start: Start): Subscription {
		const listeners = new Set<Listener>();
		const subscription = { listeners, stop: start(() => tellAll(listeners)) };
		this.held.set(key, subscription);
		return subscription;
	}

	private leave(key: string, subscription: Subscription, listener: Listener): void {
		subscription.listeners.delete(listener);
		if (subscription.listeners.size > 0 || this.held.get(key) !== subscription) return;
		this.held.delete(key);
		subscription.stop();
	}
}

function tellAll(listeners: ReadonlySet<Listener>): void {
	for (const listener of [...listeners]) listener.heard();
}
