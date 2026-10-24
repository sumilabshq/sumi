import type { AnyEvent, Emitter } from "./event";
import type { Guard } from "./guard";
import { withDefaultCallFacts, withStep } from "./handler";
import type { Handle, Handler, Inject } from "./handler";
import type { Added, Middleware, NothingAdded, Step } from "./middleware";
import type { AnyCommand, AnyRequest, InputOf } from "./request";
import type { Invalidator } from "./invalidation";
import type { Sender } from "./send";

export type HandledRequest<R extends AnyRequest, D extends Inject = Inject, C extends Added = NothingAdded> = Omit<
	Handler<R, D, "client", C>,
	"module"
>;

export type AnyHandledRequest = HandledRequest<AnyRequest, Inject, Added>;

export type InvalidatorOf<R extends AnyRequest> = R extends AnyCommand ? Invalidator : NothingAdded;

interface HandlingPlan<R extends AnyRequest, D extends Inject> {
	readonly request: R;
	readonly inject: D;
	readonly steps: readonly Step[];
	readonly sends: readonly AnyRequest[];
	readonly emits: readonly AnyEvent[];
}

const NOTHING_INJECTED: NothingAdded = Object.freeze({});

export class RequestHandlerBuilder<R extends AnyRequest, D extends Inject, C extends Added> {
	constructor(private readonly plan: HandlingPlan<R, D>) {}

	sends<const S extends readonly AnyRequest[]>(...requests: S): RequestHandlerBuilder<R, D, C & Sender<S[number]>> {
		return new RequestHandlerBuilder({
			...this.plan,
			sends: [...this.plan.sends, ...requests],
		});
	}

	emits<const E extends readonly AnyEvent[]>(...events: E): RequestHandlerBuilder<R, D, C & Emitter<E[number]>> {
		return new RequestHandlerBuilder({
			...this.plan,
			emits: [...this.plan.emits, ...events],
		});
	}

	guard<A extends Added>(step: Guard<InputOf<R>, A, Inject>): RequestHandlerBuilder<R, D, C & A> {
		return new RequestHandlerBuilder(withStep(this.plan, step));
	}

	use<A extends Added>(step: Middleware<InputOf<R>, A, Inject>): RequestHandlerBuilder<R, D, C & A> {
		return new RequestHandlerBuilder(withStep(this.plan, step));
	}

	inject<const N extends Inject>(inject: N): RequestHandlerBuilder<R, N, C> {
		return new RequestHandlerBuilder({
			...this.plan,
			inject,
		});
	}

	handle(handle: Handle<R, D, C & InvalidatorOf<R>>): HandledRequest<R, D, C> {
		const { request, inject, steps, sends, emits } = this.plan;
		return {
			request,
			inject,
			steps,
			state: "client",
			handle: withDefaultCallFacts(handle),
			watch: null,
			sends,
			emits,
		};
	}
}

export function handlingOf<R extends AnyRequest>(request: R): RequestHandlerBuilder<R, NothingAdded, NothingAdded> {
	return new RequestHandlerBuilder({
		request,
		inject: NOTHING_INJECTED,
		steps: [],
		sends: [],
		emits: [],
	});
}
