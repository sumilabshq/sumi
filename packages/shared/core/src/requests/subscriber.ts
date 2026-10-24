import type { AnyEvent, Emitter, EventInputOf } from "./event";
import { checkInject } from "./handler";
import type { Inject, Injected, Unreserved } from "./handler";
import type { Invalidator } from "./invalidation";
import type { Added, NothingAdded } from "./middleware";
import type { Sender } from "./send";

export type SubscriberHandle<E extends AnyEvent, D extends Inject, C extends Added> = (
	input: EventInputOf<E>,
	context: Injected<D> & C & Invalidator & Sender,
) => void | Promise<void>;

export interface Subscriber<E extends AnyEvent = AnyEvent, D extends Inject = Inject> {
	readonly kind: "subscriber";
	readonly event: E;
	readonly inject: D;
	readonly emits: readonly AnyEvent[];
	readonly handle: {
		bivariant(input: EventInputOf<E>, context: Injected<D> & Added): void | Promise<void>;
	}["bivariant"];
}

export type AnySubscriber = Subscriber<AnyEvent, Inject>;

interface SubscriberPlan<E extends AnyEvent, D extends Inject> {
	readonly event: E;
	readonly inject: D;
	readonly emits: readonly AnyEvent[];
}

const NOTHING_INJECTED: NothingAdded = Object.freeze({});

export class SubscriberBuilder<E extends AnyEvent, D extends Inject, C extends Added> {
	constructor(private readonly plan: SubscriberPlan<E, D>) {}

	emits<const L extends readonly AnyEvent[]>(...events: L): SubscriberBuilder<E, D, C & Emitter<L[number]>> {
		return new SubscriberBuilder({
			...this.plan,
			emits: [...this.plan.emits, ...events],
		});
	}

	inject<const N extends Inject>(inject: N & Unreserved<N>): SubscriberBuilder<E, N, C> {
		return new SubscriberBuilder({
			...this.plan,
			inject: checkInject(inject),
		});
	}

	handle(handle: SubscriberHandle<E, D, C>): Subscriber<E, D> {
		const { event, inject, emits } = this.plan;
		return {
			kind: "subscriber",
			event,
			inject,
			emits,
			handle,
		};
	}
}

export function subscriber<E extends AnyEvent>(event: E): SubscriberBuilder<E, NothingAdded, NothingAdded> {
	return new SubscriberBuilder({
		event,
		inject: NOTHING_INJECTED,
		emits: [],
	});
}
