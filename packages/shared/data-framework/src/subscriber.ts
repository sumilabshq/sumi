import type { AnyEvent, Emitter, EventInputOf } from "./event";
import type { Invalidator } from "./invalidation";
import type { Added } from "./middleware";
import type { NothingProvided } from "./module";
import type { ProvidedByRuntime } from "./runtime-provides";
import type { Sender } from "./send";

export type SubscriberHandle<H extends AnyEvent, P extends object, E extends AnyEvent> = (
	input: EventInputOf<H>,
	context: P & ProvidedByRuntime & Emitter<E> & Invalidator & Sender,
) => void | Promise<void>;

export interface Subscriber<H extends AnyEvent = AnyEvent, P extends object = object> {
	readonly kind: "subscriber";
	readonly event: H;
	readonly handle: {
		bivariant(input: EventInputOf<H>, context: P & Added): void | Promise<void>;
	}["bivariant"];
}

export type AnySubscriber = Subscriber;

export class SubscriberBuilder<H extends AnyEvent, P extends object, E extends AnyEvent> {
	constructor(private readonly event: H) {}

	handle(handle: SubscriberHandle<H, P, E>): Subscriber<H, P> {
		return {
			kind: "subscriber",
			event: this.event,
			handle,
		};
	}
}

export function subscriber<H extends AnyEvent, P extends object = NothingProvided, E extends AnyEvent = never>(
	event: H,
): SubscriberBuilder<H, P, E> {
	return new SubscriberBuilder(event);
}
