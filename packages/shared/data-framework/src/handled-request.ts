import type { AnyEvent, Emitter } from "./event";
import type { Guard } from "./guard";
import { withDefaultCallFacts, withStep } from "./handler";
import type { Handle, Handler, Inject } from "./handler";
import { requireStep } from "./middleware";
import type { Added, Middleware, NothingAdded, Step, StepNeedingOptions, TakesOptionsFirst } from "./middleware";
import type { AnyCommand, AnyRequest, InputOf } from "./request";
import type { Invalidator } from "./invalidation";

export type HandledRequest<R extends AnyRequest, P extends object = object, C extends Added = NothingAdded> = Omit<
	Handler<R, P, "client", C>,
	"module"
>;

export type AnyHandledRequest = HandledRequest<AnyRequest, object, Added>;

export type InvalidatorOf<R extends AnyRequest> = R extends AnyCommand ? Invalidator : NothingAdded;

interface HandlingPlan<R extends AnyRequest> {
	readonly request: R;
	readonly steps: readonly Step[];
	readonly emits: readonly AnyEvent[];
}

const NOTHING_INJECTED: Inject = Object.freeze({});

export class RequestHandlerBuilder<R extends AnyRequest, P extends object, C extends Added> {
	constructor(private readonly plan: HandlingPlan<R>) {}

	emits<const E extends readonly AnyEvent[]>(...events: E): RequestHandlerBuilder<R, P, C & Emitter<E[number]>> {
		return new RequestHandlerBuilder({
			...this.plan,
			emits: [...this.plan.emits, ...events],
		});
	}

	guard<A extends Added>(step: Guard<InputOf<R>, A, Inject>): RequestHandlerBuilder<R, P, C & A>;
	guard(step: StepNeedingOptions): TakesOptionsFirst;
	guard(step: Step | StepNeedingOptions): RequestHandlerBuilder<R, P, Added> | TakesOptionsFirst {
		return new RequestHandlerBuilder(withStep(this.plan, requireStep(step)));
	}

	use<A extends Added>(step: Middleware<InputOf<R>, A, Inject>): RequestHandlerBuilder<R, P, C & A>;
	use(step: StepNeedingOptions): TakesOptionsFirst;
	use(step: Step | StepNeedingOptions): RequestHandlerBuilder<R, P, Added> | TakesOptionsFirst {
		return new RequestHandlerBuilder(withStep(this.plan, requireStep(step)));
	}

	handle(handle: Handle<R, P, C & InvalidatorOf<R>>): HandledRequest<R, P, C> {
		const { request, steps, emits } = this.plan;
		return {
			request,
			inject: NOTHING_INJECTED,
			steps,
			state: "client",
			handle: withDefaultCallFacts(handle),
			watch: null,
			emits,
		};
	}
}

export function handlingOf<R extends AnyRequest, P extends object>(
	request: R,
	...steps: readonly Step[]
): RequestHandlerBuilder<R, P, NothingAdded> {
	return new RequestHandlerBuilder({
		request,
		steps,
		emits: [],
	});
}
