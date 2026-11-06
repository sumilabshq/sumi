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
	readonly isOverNetwork: boolean;
}

export interface StepCall<In = unknown> {
	readonly request: string;
	readonly input: In extends object ? Readonly<In> : In;
	readonly context: StepContext;
}

export type StepNext = (added?: Added) => Promise<Answer<unknown>>;

export type Next<A extends Added> = (...added: keyof A extends never ? [] : [added: A]) => Promise<Answer<unknown>>;

type StepKind = "middleware" | "rate-limit" | "guard" | "public";

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
	readonly kind: "middleware" | "rate-limit";
	readonly inject: D;
}

export type HandleStep<In, A extends Added, D extends Inject> = (
	call: StepCall<In>,
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

const NOTHING_INJECTED: NothingAdded = Object.freeze({});
const RATE_LIMITED = "{name} was called too often; try again shortly";
const WHOLE_CALL = "";
const LIMITED_BY = { rateLimits: RateLimits } as const;

export class MiddlewareBuilder<In, A extends Added, D extends Inject> {
	constructor(private readonly tokens: D) {}

	adds<N extends Added & NoCallFacts>(): MiddlewareBuilder<In, N, D> {
		return new MiddlewareBuilder(this.tokens);
	}

	inject<const N extends Inject>(inject: N): MiddlewareBuilder<In, A, N> {
		return new MiddlewareBuilder(inject);
	}

	handle(handle: HandleStep<In, A, D>): Middleware<In, A, D> {
		return { ...stepOf({ kind: "middleware", inject: this.tokens }, handle), kind: "middleware", inject: this.tokens };
	}
}

export function middleware<In = unknown>(): MiddlewareBuilder<In, NothingAdded, NothingAdded> {
	return new MiddlewareBuilder(NOTHING_INJECTED);
}

export function rateLimit(limit: RateLimit): Middleware {
	const limited = middleware()
		.inject(LIMITED_BY)
		.handle(async ({ request, context }, { rateLimits }, next) => {
			if (!context.isOverNetwork) return next();
			if (await rateLimits.take(callerKeyOf(request, context.user, WHOLE_CALL), limit)) return next();
			return refusalOf("rate-limited", RATE_LIMITED.replace("{name}", request));
		});
	return { ...limited, kind: "rate-limit" };
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
