import type { Guard, OpenGuard, User } from "./guard";
import type { Added, Middleware, NothingAdded, Step } from "./middleware";
import type { AnyModule, ClientModule, ModuleDefinition, Provided, ServerModule } from "./module";
import type { AnyRequest, InputOf, ReturnedOf } from "./request";

export type Token<T> = abstract new (...args: never[]) => T;

export type Inject = Readonly<Record<string, Token<object>>>;

export type Injected<D extends Inject> = { readonly [K in keyof D]: InstanceType<D[K]> };

export interface CallFacts {
	readonly idempotencyKey: string | null;
	readonly signal: AbortSignal;
	readonly user: User | null;
}

export type HandlerContext<D extends Inject, C extends Added = NothingAdded> = Injected<D> & CallFacts & C;

export type HandlerState = "client" | "public" | "guarded";

export type GuardedState = "public" | "guarded";

export const NEEDS_GUARD =
	"Add .guard(AuthenticatedGuard) or .guard(PublicGuard) before .handle(), or guard its server module";

export const NEVER_ABORTED = new AbortController().signal;

type Returned<R extends AnyRequest> = ReturnedOf<R> | Promise<ReturnedOf<R>>;

type Bivariant<F extends (...args: never[]) => unknown> = {
	bivariant(...args: Parameters<F>): ReturnType<F>;
}["bivariant"];

type Fitting<P, N extends Inject> = {
	readonly [K in keyof N]: K extends keyof P ? (P[K] extends InstanceType<N[K]> ? N[K] : never) : never;
};

export type Handle<R extends AnyRequest, D extends Inject, C extends Added = NothingAdded> = (
	input: InputOf<R>,
	context: HandlerContext<D, C>,
) => Returned<R>;

export type Watch<R extends AnyRequest, D extends Inject> = (
	input: InputOf<R>,
	injected: Injected<D>,
	changed: () => void,
) => () => void;

export interface Handler<
	R extends AnyRequest = AnyRequest,
	D extends Inject = Inject,
	S extends HandlerState = HandlerState,
	C extends Added = NothingAdded,
> {
	readonly request: R;
	readonly module: ModuleDefinition;
	readonly inject: D;
	readonly steps: readonly Step[];
	readonly state: S;
	handle(input: InputOf<R>, context: Injected<D> & Partial<CallFacts> & C): Returned<R>;
	readonly watch: Bivariant<Watch<R, D>> | null;
}

export type AnyHandler = Handler<AnyRequest, Inject>;

interface Plan<R extends AnyRequest, D extends Inject> {
	readonly request: R;
	readonly module: ModuleDefinition;
	readonly inject: D;
	readonly steps: readonly Step[];
	readonly watch: Watch<R, D> | null;
}

const NOTHING_INJECTED: NothingAdded = Object.freeze({});

export class HandlerDraft<R extends AnyRequest, P, D extends Inject, C extends Added> {
	readonly handle: readonly [typeof NEEDS_GUARD] = [NEEDS_GUARD];

	constructor(private readonly plan: Plan<R, D>) {}

	guard(step: OpenGuard): GuardedHandlerBuilder<R, P, D, "public", C>;
	guard<A extends Added>(step: Guard<InputOf<R>, A, Inject, true>): GuardedHandlerBuilder<R, P, D, "guarded", C & A>;
	guard<A extends Added>(step: Guard<InputOf<R>, A, Inject, false>): HandlerDraft<R, P, D, C & A>;
	guard(step: Step): HandlerDraft<R, P, D, Added> | GuardedHandlerBuilder<R, P, D, GuardedState, Added> {
		const plan = withStep(this.plan, step);
		if (step.kind === "public") return new GuardedHandlerBuilder(plan, "public");
		return step.needsUser ? new GuardedHandlerBuilder(plan, "guarded") : new HandlerDraft(plan);
	}

	use<A extends Added>(step: Middleware<InputOf<R>, A, Inject>): HandlerDraft<R, P, D, C & A> {
		return new HandlerDraft(withStep(this.plan, step));
	}

	inject<const N extends Inject>(inject: N & Fitting<P, N>): HandlerDraft<R, P, N, C> {
		return new HandlerDraft({ ...this.plan, inject, watch: null });
	}
}

export class GuardedHandlerBuilder<R extends AnyRequest, P, D extends Inject, S extends GuardedState, C extends Added> {
	constructor(
		private readonly plan: Plan<R, D>,
		readonly state: S,
	) {}

	guard<A extends Added>(
		this: GuardedHandlerBuilder<R, P, D, "public", C>,
		step: Guard<InputOf<R>, A, Inject, false>,
	): GuardedHandlerBuilder<R, P, D, "public", C & A>;
	guard<A extends Added>(
		this: GuardedHandlerBuilder<R, P, D, "guarded", C>,
		step: Guard<InputOf<R>, A, Inject>,
	): GuardedHandlerBuilder<R, P, D, "guarded", C & A>;
	guard(step: Step): GuardedHandlerBuilder<R, P, D, GuardedState, Added> {
		return new GuardedHandlerBuilder<R, P, D, GuardedState, Added>(withStep(this.plan, step), this.state);
	}

	use<A extends Added>(step: Middleware<InputOf<R>, A, Inject>): GuardedHandlerBuilder<R, P, D, S, C & A> {
		return new GuardedHandlerBuilder(withStep(this.plan, step), this.state);
	}

	inject<const N extends Inject>(inject: N & Fitting<P, N>): GuardedHandlerBuilder<R, P, N, S, C> {
		return new GuardedHandlerBuilder({ ...this.plan, inject, watch: null }, this.state);
	}

	watch(watch: Watch<R, D>): GuardedHandlerBuilder<R, P, D, S, C> {
		return new GuardedHandlerBuilder({ ...this.plan, watch }, this.state);
	}

	handle(handle: Handle<R, D, C>): Handler<R, D, S, C> {
		return handlerOf(this.plan, this.state, handle);
	}
}

export class ClientHandlerBuilder<R extends AnyRequest, P, D extends Inject, C extends Added = NothingAdded> {
	constructor(private readonly plan: Plan<R, D>) {}

	guard<A extends Added>(step: Guard<InputOf<R>, A, Inject, false>): ClientHandlerBuilder<R, P, D, C & A> {
		return new ClientHandlerBuilder(withStep(this.plan, step));
	}

	inject<const N extends Inject>(inject: N & Fitting<P, N>): ClientHandlerBuilder<R, P, N, C> {
		return new ClientHandlerBuilder({ ...this.plan, inject, watch: null });
	}

	watch(watch: Watch<R, D>): ClientHandlerBuilder<R, P, D, C> {
		return new ClientHandlerBuilder({ ...this.plan, watch });
	}

	handle(handle: Handle<R, D, C>): Handler<R, D, "client", C> {
		return handlerOf(this.plan, "client", handle);
	}
}

export function handler<R extends AnyRequest, P extends Provided, Q>(
	request: R,
	module: ClientModule<P, Q>,
): ClientHandlerBuilder<R, P, NothingAdded>;
export function handler<R extends AnyRequest, P extends Provided, C extends Added>(
	request: R,
	module: ServerModule<P, "unguarded", C>,
): HandlerDraft<R, P, NothingAdded, C>;
export function handler<R extends AnyRequest, P extends Provided, S extends GuardedState, C extends Added>(
	request: R,
	module: ServerModule<P, S, C>,
): GuardedHandlerBuilder<R, P, NothingAdded, S, C>;
export function handler(
	request: AnyRequest,
	module: AnyModule,
):
	| ClientHandlerBuilder<AnyRequest, Provided, NothingAdded>
	| HandlerDraft<AnyRequest, Provided, NothingAdded, Added>
	| GuardedHandlerBuilder<AnyRequest, Provided, NothingAdded, GuardedState, Added> {
	const plan = { request, module, inject: NOTHING_INJECTED, steps: [], watch: null };
	if (module.runs === "client") return new ClientHandlerBuilder(plan);
	return module.cover === "unguarded" ? new HandlerDraft(plan) : new GuardedHandlerBuilder(plan, module.cover);
}

function withStep<R extends AnyRequest, D extends Inject>(plan: Plan<R, D>, step: Step): Plan<R, D> {
	return { ...plan, steps: [...plan.steps, step] };
}

function handlerOf<R extends AnyRequest, D extends Inject, S extends HandlerState, C extends Added>(
	{ request, module, inject, steps, watch }: Plan<R, D>,
	state: S,
	handle: Handle<R, D, C>,
): Handler<R, D, S, C> {
	return {
		request,
		module,
		inject,
		steps,
		state,
		handle: (input, context) => handle(input, { idempotencyKey: null, signal: NEVER_ABORTED, user: null, ...context }),
		watch,
	};
}
