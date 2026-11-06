import { refusalOf } from "./answer";
import type { Answer } from "./answer";
import type { User } from "./guard";
import type { CallFacts, Inject, Injected } from "./handler";
import { callerKeyOf } from "./policies";
import { RateLimits } from "./rate-limits";
import type { RateLimit } from "./rate-limits";

export type Added = Readonly<Record<string, unknown>>;

export type NothingAdded = Readonly<Record<never, never>>;

export type NoCallFacts = { readonly [K in keyof CallFacts]?: never };

export interface StepContext {
	readonly user: User | null;
}

export interface StepCall<In = unknown> {
	readonly request: string;
	readonly input: In extends object ? Readonly<In> : In;
	readonly context: StepContext;
}

export type StepOptions = readonly unknown[];

export type StepCallWithOptions<In, O extends StepOptions> = StepCall<In> & { readonly options: O };

export type DeclaredStep<S extends Step, O extends StepOptions> = [O] extends [never]
	? S
	: [] extends O
		? S & ((...options: O) => S)
		: (...options: O) => S;

export type StepNeedingOptions = (...options: never) => Step;

const TAKES_OPTIONS_FIRST =
	"this step takes options: call it with them first, as .use(Step(options)) or .guard(Step(options))";

export type TakesOptionsFirst = typeof TAKES_OPTIONS_FIRST;

export type StepNext = (added?: Added) => Promise<Answer<unknown>>;

export type Next<A extends Added> = (...added: keyof A extends never ? [] : [added: A]) => Promise<Answer<unknown>>;

type StepKind = "middleware" | "guard" | "public";

export interface Step {
	readonly kind: StepKind;
	readonly inject: Inject;
	readonly needsUser: boolean;
	readonly label: string | null;
	handle(call: StepCall, injected: Injected<Inject>, next: StepNext): Promise<Answer<unknown>>;
}

export interface Typed<In, A extends Added, D extends Inject> {
	readonly inject: D;
	readonly needsInput?: (input: In) => void;
	readonly adds?: (added: A) => A;
}

export interface Middleware<In = unknown, A extends Added = Added, D extends Inject = Inject>
	extends Step, Typed<In, A, D> {
	readonly kind: "middleware";
	readonly inject: D;
}

export type HandleStep<In, A extends Added, D extends Inject, O extends StepOptions = never> = (
	call: StepCallWithOptions<In, O>,
	injected: Injected<D>,
	next: Next<A>,
) => Promise<Answer<unknown>>;

export interface StepShape {
	readonly kind: StepKind;
	readonly inject: Inject;
	readonly needsUser?: boolean;
	readonly label?: string | null;
}

type AnyHandle = {
	bivariant(call: StepCall, injected: Injected<Inject>, next: StepNext): Promise<Answer<unknown>>;
}["bivariant"];

type AnyHandleWithOptions = {
	bivariant(
		call: StepCallWithOptions<unknown, StepOptions>,
		injected: Injected<Inject>,
		next: StepNext,
	): Promise<Answer<unknown>>;
}["bivariant"];

const NOTHING_INJECTED: NothingAdded = Object.freeze({});
const NO_STEP_OPTIONS: StepOptions = Object.freeze([]);
const RATE_LIMITED = "{name} was called too often; try again shortly";
const WHOLE_CALL = "";

export class MiddlewareBuilder<In, A extends Added, D extends Inject, O extends StepOptions = never> {
	constructor(
		private readonly tokens: D,
		private readonly takesOptions: boolean,
	) {}

	adds<N extends Added & NoCallFacts>(): MiddlewareBuilder<In, N, D, O> {
		return new MiddlewareBuilder(this.tokens, this.takesOptions);
	}

	options<const N extends StepOptions>(): MiddlewareBuilder<In, A, D, N> {
		return new MiddlewareBuilder(this.tokens, true);
	}

	inject<const N extends Inject>(inject: N): MiddlewareBuilder<In, A, N, O> {
		return new MiddlewareBuilder(inject, this.takesOptions);
	}

	handle(handle: HandleStep<In, A, D, O>): DeclaredStep<Middleware<In, A, D>, O> {
		const handling: AnyHandleWithOptions = handle;
		const { tokens } = this;
		const middlewareOf = (options: StepOptions): Middleware<In, A, D> => {
			const step = stepOf({ kind: "middleware", inject: tokens }, (call, injected, next) =>
				handling({ ...call, options }, injected, next),
			);
			return { ...step, kind: "middleware", inject: tokens };
		};
		return declareStep(middlewareOf, this.takesOptions);
	}
}

export function middleware<In = unknown>(): MiddlewareBuilder<In, NothingAdded, NothingAdded> {
	return new MiddlewareBuilder(NOTHING_INJECTED, false);
}

export const RateLimitMiddleware = middleware()
	.options<[limit: RateLimit]>()
	.inject({ rateLimits: RateLimits })
	.handle(async ({ request, context, options: [limit] }, { rateLimits }, next) => {
		if (await rateLimits.take(callerKeyOf(request, context.user, WHOLE_CALL), limit)) return next();
		return refusalOf("rate-limited", RATE_LIMITED.replace("{name}", request));
	});

export function declareStep<S extends Step, O extends StepOptions>(
	stepWith: (options: StepOptions) => S,
	takesOptions: boolean,
): DeclaredStep<S, O>;
export function declareStep(stepWith: (options: StepOptions) => Step, takesOptions: boolean): Step {
	const bare = stepWith(NO_STEP_OPTIONS);

	if (!takesOptions) {
		return bare;
	}

	return Object.freeze(Object.assign((...options: StepOptions) => stepWith(options), bare));
}

export function requireStep(step: Step | StepNeedingOptions): Step {
	if (!isStep(step)) {
		throw new Error(TAKES_OPTIONS_FIRST);
	}

	return step;
}

function isStep(step: Step | StepNeedingOptions): step is Step {
	return "kind" in step && "handle" in step;
}

export function stepOf(shape: StepShape, handle: AnyHandle): Step {
	return Object.freeze({
		kind: shape.kind,
		inject: shape.inject,
		needsUser: shape.needsUser ?? false,
		label: shape.label ?? null,
		handle: (call: StepCall, injected: Injected<Inject>, next: StepNext) => handle(call, injected, next),
	});
}

export function isGuardStep(step: Step): boolean {
	return step.kind === "guard" || step.kind === "public";
}
