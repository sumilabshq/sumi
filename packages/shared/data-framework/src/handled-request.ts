import type { z } from "zod";
import type { Emitter } from "./event";
import type { Guard } from "./guard";
import { withDefaultCallFacts, withStep } from "./handler";
import type { Handle, Handler, Inject } from "./handler";
import { requireStep } from "./middleware";
import type {
	Added,
	Middleware,
	NothingAdded,
	RequiresMet,
	Step,
	StepNeedingOptions,
	TakesOptionsFirst,
} from "./middleware";
import type { AnyCommand, AnyRequest, Contract, InputOf } from "./request";
import type { Invalidator } from "./invalidation";
import type { ProvidedByRuntime } from "./runtime-provides";

export type HandledRequest<R extends AnyRequest, P extends object = object, C extends Added = NothingAdded> = Omit<
	Handler<R, P, "client", C>,
	"module"
>;

export type AnyHandledRequest = HandledRequest<AnyRequest, object, Added>;

export type InvalidatorOf<R extends AnyRequest> = R extends AnyCommand ? Invalidator : NothingAdded;

export type EmitterOf<R extends AnyRequest> =
	R extends Contract<"command", z.ZodType, z.ZodType, "keyed", object, infer E> ? Emitter<E> : NothingAdded;

interface HandlingPlan<R extends AnyRequest> {
	readonly request: R;
	readonly steps: readonly Step[];
}

const NOTHING_INJECTED: Inject = Object.freeze({});

export class RequestHandlerBuilder<R extends AnyRequest, P extends object, C extends Added> {
	constructor(private readonly plan: HandlingPlan<R>) {}

	guard<A extends Added, D extends Inject>(
		step: Guard<InputOf<R>, A, D> & RequiresMet<D, P & ProvidedByRuntime>,
	): RequestHandlerBuilder<R, P, C & A>;
	guard(step: StepNeedingOptions): TakesOptionsFirst;
	guard(step: Step | StepNeedingOptions): RequestHandlerBuilder<R, P, Added> | TakesOptionsFirst {
		return new RequestHandlerBuilder(withStep(this.plan, requireStep(step)));
	}

	use<A extends Added, D extends Inject>(
		step: Middleware<InputOf<R>, A, D> & RequiresMet<D, P & ProvidedByRuntime>,
	): RequestHandlerBuilder<R, P, C & A>;
	use(step: StepNeedingOptions): TakesOptionsFirst;
	use(step: Step | StepNeedingOptions): RequestHandlerBuilder<R, P, Added> | TakesOptionsFirst {
		return new RequestHandlerBuilder(withStep(this.plan, requireStep(step)));
	}

	handle(handle: Handle<R, P & ProvidedByRuntime, C & InvalidatorOf<R> & EmitterOf<R>>): HandledRequest<R, P, C> {
		const { request, steps } = this.plan;
		return {
			request,
			inject: NOTHING_INJECTED,
			steps,
			state: "client",
			handle: withDefaultCallFacts(handle),
			watch: null,
		};
	}
}

export function handlingOf<R extends AnyRequest, P extends object>(
	request: R,
	...steps: readonly Step[]
): RequestHandlerBuilder<R, P, NothingAdded> {
	return new RequestHandlerBuilder({ request, steps });
}
