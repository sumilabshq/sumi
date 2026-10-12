import type { AppHost } from "./handles";

export type Token<T> = abstract new (...args: never[]) => T;

export interface Provided<T = unknown> {
	readonly token: Token<T>;
	readonly make: (host: AppHost) => T;
}

export interface Resolver {
	resolve<T>(wanted: Token<T>): T;
}

const NOT_BUILDING = "inject({token}) runs only while the app builds a handler or a provided value";

// TRADE-OFF: inject() reads this slot, so it works only synchronously while the container builds; constructor injection needs decorator metadata.
const BUILDING: { current: Resolver | null } = { current: null };

export function provided<T>(wanted: Token<T>, make: (host: AppHost) => NoInfer<T>): Provided<T> {
	return { token: wanted, make };
}

export function inject<T>(wanted: Token<T>): T {
	const resolver = BUILDING.current;
	if (resolver === null) throw new Error(NOT_BUILDING.replace("{token}", wanted.name));
	return resolver.resolve(wanted);
}

export function buildWith<T>(resolver: Resolver, make: () => T): T {
	const before = BUILDING.current;
	BUILDING.current = resolver;
	try {
		return make();
	} finally {
		BUILDING.current = before;
	}
}
