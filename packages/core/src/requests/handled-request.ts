import type { Guard } from "./guard";
import { withDefaultCallFacts, withStep } from "./handler";
import type { Handle, Handler, Inject, Watch } from "./handler";
import type { Added, Middleware, NothingAdded, Step } from "./middleware";
import type { AnyRequest, InputOf } from "./request";
import type { Sender } from "./send";

export type HandledRequest<R extends AnyRequest, D extends Inject = Inject, C extends Added = NothingAdded> = Omit<
	Handler<R, D, "client", C>,
	"module"
>;

export type AnyHandledRequest = HandledRequest<AnyRequest, Inject, Added>;

interface HandlingPlan<R extends AnyRequest, D extends Inject> {
	readonly request: R;
	readonly inject: D;
	readonly steps: readonly Step[];
	readonly watch: Watch<R, D> | null;
	readonly sends: readonly AnyRequest[];
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
			watch: null,
		});
	}

	watch(watch: Watch<R, D>): RequestHandlerBuilder<R, D, C> {
		return new RequestHandlerBuilder({
			...this.plan,
			watch,
		});
	}

	handle(handle: Handle<R, D, C>): HandledRequest<R, D, C> {
		const { request, inject, steps, watch, sends } = this.plan;
		return {
			request,
			inject,
			steps,
			state: "client",
			handle: withDefaultCallFacts(handle),
			watch,
			sends,
		};
	}
}

export function handlingOf<R extends AnyRequest>(request: R): RequestHandlerBuilder<R, NothingAdded, NothingAdded> {
	return new RequestHandlerBuilder({
		request,
		inject: NOTHING_INJECTED,
		steps: [],
		watch: null,
		sends: [],
	});
}
