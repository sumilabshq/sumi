import type { Middleware, RequestCall } from "./handles";

type Step = () => Promise<unknown>;

export function throughMiddleware(use: readonly Middleware[], call: RequestCall, last: Step): Promise<unknown> {
	const chained = use.reduceRight<Step>((next, middleware) => onceOnly(() => middleware(call, next)), onceOnly(last));
	return chained();
}

export function frozen<T>(value: T): T {
	if (typeof value !== "object" || value === null || !isPlain(value)) return value;
	for (const field of Object.values(value)) frozen(field);
	Object.freeze(value);
	return value;
}

function onceOnly(step: Step): Step {
	const held: { called: Promise<unknown> | null } = { called: null };
	return () => (held.called ??= (async () => step())());
}

function isPlain(value: object): boolean {
	const prototype: unknown = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === Array.prototype || prototype === null;
}
