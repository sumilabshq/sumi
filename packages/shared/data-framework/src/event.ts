import { z } from "zod";
import type { EventSource } from "./event-source";
import type { Platform } from "./platform-module";
import { fullNameOf, labelOf, unnamedIdentity } from "./identity";
import { NO_METADATA, metadataWith } from "./metadata";
import type { Metadata } from "./metadata";
import type { Identity } from "./identity";

export type PlatformSources = Readonly<Partial<Record<Platform, EventSource>>>;

type Sources = EventSource | PlatformSources;

const EVENT = "an event";

export class Event<I extends z.ZodType> {
	readonly kind = "event";

	constructor(
		readonly identity: Identity,
		readonly inputSchema: I,
		private readonly sources: Sources | null,
		private readonly metadataFields: Metadata = NO_METADATA,
	) {}

	get name(): string {
		return fullNameOf(this.identity, EVENT);
	}

	get module(): string | null {
		return this.identity.module;
	}

	input<S extends z.ZodType>(schema: S): Event<S> {
		return new Event(this.identity, schema, this.sources, this.metadataFields);
	}

	from(sources: Sources): Event<I> {
		return new Event(this.identity, this.inputSchema, sources, this.metadataFields);
	}

	metadata(): Metadata;
	metadata(fields: Metadata): Event<I>;
	metadata(fields?: Metadata): Metadata | Event<I> {
		if (fields === undefined) {
			return this.metadataFields;
		}

		return new Event(this.identity, this.inputSchema, this.sources, metadataWith(labelOf(this.identity, EVENT), this.metadataFields, fields));
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
		if (this.module !== null) {
			return this;
		}

		return new Event({ ...this.identity, module }, this.inputSchema, this.sources, this.metadataFields);
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

export function event(): Event<z.ZodVoid> {
	return new Event(unnamedIdentity(), z.void(), null);
}

function isEventSource(sources: Sources): sources is EventSource {
	return "listen" in sources && typeof sources.listen === "function";
}
