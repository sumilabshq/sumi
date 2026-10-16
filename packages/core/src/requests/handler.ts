import type { User } from "./guard";
import type { AnyRequest, InputOf, ReturnedOf } from "./request";

export type Token<T> = abstract new (...args: never[]) => T;

export type Inject = Readonly<Record<string, Token<object>>>;

export type Injected<D extends Inject> = { readonly [K in keyof D]: InstanceType<D[K]> };

export interface CallFacts {
	readonly idempotencyKey: string | null;
	readonly signal: AbortSignal;
	readonly user: User | null;
}

export type HandlerContext<D extends Inject> = Injected<D> & CallFacts;

type Returned<R extends AnyRequest> = ReturnedOf<R> | Promise<ReturnedOf<R>>;

type Bivariant<F extends (...args: never[]) => unknown> = {
	bivariant(...args: Parameters<F>): ReturnType<F>;
}["bivariant"];

export type Run<R extends AnyRequest, D extends Inject> = (
	input: InputOf<R>,
	context: HandlerContext<D>,
) => Returned<R>;

export type Watch<R extends AnyRequest, D extends Inject> = (
	input: InputOf<R>,
	injected: Injected<D>,
	changed: () => void,
) => () => void;

interface HandlerDefinition<R extends AnyRequest, D extends Inject> {
	readonly inject?: D;
	readonly run: Run<R, D>;
	readonly watch?: Watch<R, D>;
}

export interface Handler<R extends AnyRequest = AnyRequest, D extends Inject = Inject> {
	readonly request: R;
	readonly inject: D;
	run(input: InputOf<R>, context: Injected<D> & Partial<CallFacts>): Returned<R>;
	readonly watch: Bivariant<Watch<R, D>> | null;
}

export type AnyHandler = Handler<AnyRequest, Inject>;

const NEVER_ABORTED = new AbortController().signal;
const NOTHING_INJECTED = Object.freeze({});

export function handler<R extends AnyRequest, const D extends Inject = Record<never, never>>(
	request: R,
	definition: HandlerDefinition<R, D>,
): Handler<R, D>;
export function handler(request: AnyRequest, definition: HandlerDefinition<AnyRequest, Inject>): AnyHandler {
	const { run, watch } = definition;
	return {
		request,
		inject: definition.inject ?? NOTHING_INJECTED,
		run: (input, context) => run(input, { idempotencyKey: null, signal: NEVER_ABORTED, user: null, ...context }),
		watch: watch ?? null,
	};
}
