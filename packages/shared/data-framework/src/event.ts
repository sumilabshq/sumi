import { z } from "zod";
import type { EventSource } from "./event-source";
import type { Platform } from "./platform-module";
import { moduleOfName } from "./request";

export type PlatformSources = Readonly<Partial<Record<Platform, EventSource>>>;

type Sources = EventSource | PlatformSources;

export class Event<I extends z.ZodType, N extends string = string> {
	readonly kind = "event";
	readonly module: string | null;
	readonly name: string;

	constructor(
		readonly declaredName: N,
		readonly inputSchema: I,
		private readonly sources: Sources | null,
		stampedName: string = declaredName,
	) {
		this.name = stampedName;
		this.module = moduleOfName(stampedName);
	}

	input<S extends z.ZodType>(schema: S): Event<S, N> {
		return new Event(this.declaredName, schema, this.sources, this.name);
	}

	from(sources: Sources): Event<I, N> {
		return new Event(this.declaredName, this.inputSchema, sources, this.name);
	}

	// TODO: event visibility is read by the generator only
	public(): Event<I, N> {
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

	inModule(module: string): Event<I, N> {
		if (this.module !== null) {
			return this;
		}

		return new Event(this.declaredName, this.inputSchema, this.sources, `${module}/${this.name}`);
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

export function event<const N extends string>(name: N): Event<z.ZodVoid, N> {
	return new Event(name, z.void(), null);
}

function isEventSource(sources: Sources): sources is EventSource {
	return "listen" in sources && typeof sources.listen === "function";
}
