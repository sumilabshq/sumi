import type { AnyEvent, Emitter } from "./event";
import type { Guard } from "./guard";
import { checkInject, withDefaultCallFacts, withStep } from "./handler";
import type { Handle, Handler, Inject, Unreserved } from "./handler";
import { requireStep } from "./middleware";
import type { Added, Middleware, NothingAdded, Step, StepNeedingOptions, TakesOptionsFirst } from "./middleware";
import type { AnyCommand, AnyRequest, InputOf } from "./request";
import type { Invalidator } from "./invalidation";

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
	readonly emits: readonly AnyEvent[];
}

const NOTHING_INJECTED: NothingAdded = Object.freeze({});

export class RequestHandlerBuilder<R extends AnyRequest, D extends Inject, C extends Added> {
	constructor(private readonly plan: HandlingPlan<R, D>) {}

	emits<const E extends readonly AnyEvent[]>(...events: E): RequestHandlerBuilder<R, D, C & Emitter<E[number]>> {
		return new RequestHandlerBuilder({
			...this.plan,
			emits: [...this.plan.emits, ...events],
		});
	}

	guard<A extends Added>(step: Guard<InputOf<R>, A, Inject>): RequestHandlerBuilder<R, D, C & A>;
	guard(step: StepNeedingOptions): TakesOptionsFirst;
	guard(step: Step | StepNeedingOptions): RequestHandlerBuilder<R, D, Added> | TakesOptionsFirst {
		return new RequestHandlerBuilder(withStep(this.plan, requireStep(step)));
	}

	use<A extends Added>(step: Middleware<InputOf<R>, A, Inject>): RequestHandlerBuilder<R, D, C & A>;
	use(step: StepNeedingOptions): TakesOptionsFirst;
	use(step: Step | StepNeedingOptions): RequestHandlerBuilder<R, D, Added> | TakesOptionsFirst {
		return new RequestHandlerBuilder(withStep(this.plan, requireStep(step)));
	}

	inject<const N extends Inject>(inject: N & Unreserved<N>): RequestHandlerBuilder<R, N, C> {
		return new RequestHandlerBuilder({
			...this.plan,
			inject: checkInject(inject),
		});
	}

	handle(handle: Handle<R, D, C & InvalidatorOf<R>>): HandledRequest<R, D, C> {
		const { request, inject, steps, emits } = this.plan;
		return {
			request,
			inject,
			steps,
			state: "client",
			handle: withDefaultCallFacts(handle),
			watch: null,
			emits,
		};
	}
}

export function handlingOf<R extends AnyRequest>(
	request: R,
	...steps: readonly Step[]
): RequestHandlerBuilder<R, NothingAdded, NothingAdded> {
	return new RequestHandlerBuilder({
		request,
		inject: NOTHING_INJECTED,
		steps,
		emits: [],
	});
}
