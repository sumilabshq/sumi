import { z } from "zod";
import type { EventSource } from "./event-source";
import type { Platform } from "./platform-module";
import { moduleOfName } from "./request";

export type PlatformSources = Readonly<Partial<Record<Platform, EventSource>>>;

type Sources = EventSource | PlatformSources;

export class Event<I extends z.ZodType> {
	readonly kind = "event";
	readonly module: string | null;

	constructor(
		readonly name: string,
		readonly inputSchema: I,
		private readonly sources: Sources | null,
	) {
		this.module = moduleOfName(name);
	}

	input<S extends z.ZodType>(schema: S): Event<S> {
		return new Event(this.name, schema, this.sources);
	}

	from(sources: Sources): Event<I> {
		return new Event(this.name, this.inputSchema, sources);
	}

	// TODO: event visibility is read by the generator only
	public(): Event<I> {
		return this;
	}

	sourceOn(platform: Platform | null): EventSource | null {
		const { sources } = this;

		if (sources === null) {
			return null;
		}

		if (isEventSource(sources)) {
			return sources;
		}

		return platform === null ? null : (sources[platform] ?? null);
	}

	inModule(module: string): Event<I> {
		return this.module === null ? new Event(`${module}/${this.name}`, this.inputSchema, this.sources) : this;
	}
}

export type AnyEvent = Event<z.ZodType>;

export type EventSentOf<E extends AnyEvent> = z.input<E["inputSchema"]>;

export type EventInputOf<E extends AnyEvent> = z.output<E["inputSchema"]>;

export type EventArgs<E extends AnyEvent> = [EventSentOf<E>] extends [void]
	? [input?: EventSentOf<E>]
	: [input: EventSentOf<E>];

export type Emit<E extends AnyEvent> = <V extends E>(event: V, ...input: EventArgs<V>) => void;

export type Emitter<E extends AnyEvent> = Readonly<Record<"emit", Emit<E>>>;

export function event(name: string): Event<z.ZodVoid> {
	return new Event(name, z.void(), null);
}

function isEventSource(sources: Sources): sources is EventSource {
	return "listen" in sources && typeof sources.listen === "function";
}
