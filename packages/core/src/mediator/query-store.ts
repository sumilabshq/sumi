import { stableKey } from "../gateway/stable-key";
import type { AnyQuery } from "./request";
import type { App } from "./sends";

export interface QueryEntry {
	readonly status: "loading" | "ready" | "failed";
	readonly data: unknown;
	readonly failure: string | null;
	readonly read: Promise<void>;
}

interface Held {
	entry: QueryEntry;
	readonly request: AnyQuery;
	readonly input: unknown;
	readonly listeners: Set<() => void>;
}

export const NOT_READ: QueryEntry = { status: "loading", data: null, failure: null, read: Promise.resolve() };

export class QueryStore {
	private readonly held = new Map<string, Held>();

	constructor(private readonly app: App) {}

	keyOf(request: AnyQuery, input: unknown): string {
		return `${request.name} ${stableKey(input)}`;
	}

	peek(key: string): QueryEntry | null {
		return this.held.get(key)?.entry ?? null;
	}

	start(request: AnyQuery, input: unknown): QueryEntry {
		const key = this.keyOf(request, input);
		const known = this.held.get(key);
		if (known !== undefined) return known.entry;
		const held: Held = { entry: NOT_READ, request, input, listeners: new Set() };
		this.held.set(key, held);
		held.entry = { ...NOT_READ, read: this.read(held) };
		return held.entry;
	}

	subscribe(request: AnyQuery, input: unknown, listener: () => void): () => void {
		const key = this.keyOf(request, input);
		this.start(request, input);
		const listeners = this.held.get(key)?.listeners;
		listeners?.add(listener);
		return () => listeners?.delete(listener);
	}

	reread(module: string): void {
		// TODO: per-request invalidation
		for (const [key, held] of this.held) {
			if (held.request.module !== module) continue;
			if (held.listeners.size === 0) this.held.delete(key);
			else void this.read(held);
		}
	}

	private async read(held: Held): Promise<void> {
		const answer = await this.app.send(held.request, held.input);
		const read = Promise.resolve();
		held.entry = answer.ok
			? { status: "ready", data: answer.output, failure: null, read }
			: { status: "failed", data: held.entry.data, failure: answer.reason, read };
		for (const listener of held.listeners) listener();
	}
}
