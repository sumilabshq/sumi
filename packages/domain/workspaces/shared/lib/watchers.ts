export class Watchers {
	private readonly held = new Set<() => void>();

	watch = (changed: () => void): (() => void) => {
		this.held.add(changed);
		return () => void this.held.delete(changed);
	};

	tell(): void {
		for (const changed of [...this.held]) {
			changed();
		}
	}
}
