import type { AnyEvent, Emitter, EventInputOf } from "./event";
import type { Invalidator } from "./invalidation";
import type { Added, NothingAdded } from "./middleware";
import type { NothingProvided } from "./module";
import type { Sender } from "./send";

export type SubscriberHandle<E extends AnyEvent, P extends object, C extends Added> = (
	input: EventInputOf<E>,
	context: P & C & Invalidator & Sender,
) => void | Promise<void>;

export interface Subscriber<E extends AnyEvent = AnyEvent, P extends object = object> {
	readonly kind: "subscriber";
	readonly event: E;
	readonly emits: readonly AnyEvent[];
	readonly handle: {
		bivariant(input: EventInputOf<E>, context: P & Added): void | Promise<void>;
	}["bivariant"];
}

export type AnySubscriber = Subscriber;

interface SubscriberPlan<E extends AnyEvent> {
	readonly event: E;
	readonly emits: readonly AnyEvent[];
}

export class SubscriberBuilder<E extends AnyEvent, P extends object, C extends Added> {
	constructor(private readonly plan: SubscriberPlan<E>) {}

	emits<const L extends readonly AnyEvent[]>(...events: L): SubscriberBuilder<E, P, C & Emitter<L[number]>> {
		return new SubscriberBuilder({
			...this.plan,
			emits: [...this.plan.emits, ...events],
		});
	}

	handle(handle: SubscriberHandle<E, P, C>): Subscriber<E, P> {
		const { event, emits } = this.plan;
		return {
			kind: "subscriber",
			event,
			emits,
			handle,
		};
	}
}

export function subscriber<E extends AnyEvent, P extends object = NothingProvided>(
	event: E,
): SubscriberBuilder<E, P, NothingAdded> {
	return new SubscriberBuilder({
		event,
		emits: [],
	});
}
