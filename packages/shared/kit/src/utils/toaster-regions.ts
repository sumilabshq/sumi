class ToasterRegions {
	private held: readonly symbol[] = [];
	private readonly listeners = new Set<() => void>();

	readonly owner = (): symbol | null => this.held[0] ?? null;

	readonly subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	};

	claim(region: symbol): () => void {
		this.change([...this.held, region]);
		return () => this.change(this.held.filter((held) => held !== region));
	}

	private change(next: readonly symbol[]): void {
		const wasOwner = this.owner();
		this.held = next;

		if (this.owner() === wasOwner) {
			return;
		}

		for (const listener of [...this.listeners]) {
			listener();
		}
	}
}

export const TOASTER_REGIONS = new ToasterRegions();
