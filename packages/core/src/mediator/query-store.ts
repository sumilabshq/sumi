import type { CommandAnswer } from "../gateway/run-handler";
import { stableKey } from "../gateway/stable-key";
import type { AnyQuery, AnyRequest } from "./request";
import type { App } from "./sends";

export interface QueryEntry {
	readonly status: "loading" | "ready" | "failed";
	readonly data: unknown;
	readonly failure: string | null;
	readonly read: Promise<void>;
}

interface Held {
	entry: QueryEntry;
	issued: number;
	readonly request: AnyQuery;
	readonly input: unknown;
	readonly listeners: Set<() => void>;
}

export const NOT_READ: QueryEntry = { status: "loading", data: null, failure: null, read: Promise.resolve() };

export class QueryStore {
	private readonly held = new Map<string, Held>();

	constructor(private readonly sender: Pick<App, "send">) {}

	keyOf(request: AnyQuery, input: unknown): string {
		return `${request.name} ${stableKey(input)}`;
	}

	peek(key: string): QueryEntry | null {
		return this.held.get(key)?.entry ?? null;
	}

	start(request: AnyQuery, input: unknown): QueryEntry {
		const key = this.keyOf(request, input);
		const known = this.held.get(key);
		if (known !== undefined && !isAbandonedFailure(known)) return known.entry;
		const held: Held = { entry: NOT_READ, issued: 0, request, input, listeners: new Set() };
		this.held.set(key, held);
		held.entry = { ...NOT_READ, read: this.read(held) };
		return held.entry;
	}

	subscribe(request: AnyQuery, input: unknown, listener: () => void): () => void {
		const key = this.keyOf(request, input);
		this.start(request, input);
		const held = this.held.get(key);
		held?.listeners.add(listener);
		return () => {
			held?.listeners.delete(listener);
			this.drop(key);
		};
	}

	drop(key: string): void {
		if (this.held.get(key)?.listeners.size === 0) this.held.delete(key);
	}

	afterCommand(request: AnyRequest, answer: CommandAnswer<unknown>): void {
		if (request.kind !== "command" || (!answer.ok && !answer.ran)) return;
		// TODO: per-request invalidation
		for (const [key, held] of this.held) {
			if (held.listeners.size === 0) this.held.delete(key);
			else void this.read(held);
		}
	}

	private async read(held: Held): Promise<void> {
		held.issued += 1;
		const issued = held.issued;
		const answer = await this.sender.send(held.request, held.input);
		if (issued !== held.issued) return;
		const read = Promise.resolve();
		held.entry = answer.ok
			? { status: "ready", data: answer.output, failure: null, read }
			: { status: "failed", data: held.entry.data, failure: answer.reason, read };
		for (const listener of held.listeners) listener();
	}
}

function isAbandonedFailure(held: Held): boolean {
	return held.entry.status === "failed" && held.listeners.size === 0;
}
