export interface Read<T> {
	readonly value: T;
	readonly version: number;
}

interface Held<T> {
	readonly value: Promise<T>;
	readonly version: number;
	isFresh: boolean;
}

export class ReadCache<T> {
	private readonly held = new Map<string, Held<T>>();
	private versions = 0;

	async read(app: string, isWatched: boolean, load: () => Promise<T>): Promise<Read<T>> {
		const fresh = this.held.get(app);
		if (fresh?.isFresh) return { value: await fresh.value, version: fresh.version };
		this.versions += 1;
		const loading: Held<T> = { value: load(), version: this.versions, isFresh: isWatched };
		this.held.set(app, loading);
		loading.value.catch(() => (loading.isFresh = false));
		return { value: await loading.value, version: loading.version };
	}

	stale(app: string): void {
		const one = this.held.get(app);
		if (one) one.isFresh = false;
	}
}
