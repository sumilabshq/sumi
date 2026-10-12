import type { AppHost } from "./handles";

declare const PROVIDES: unique symbol;

export type Token<T> = symbol & { readonly [PROVIDES]?: T };

export type Provider = (host: AppHost) => unknown;

export interface Providers {
	readonly [token: symbol]: Provider;
}

export interface Resolver {
	resolve<T>(wanted: Token<T>): T;
}

const NOT_BUILDING = "inject({token}) runs only while the app builds a handler or a provided value";

const BUILDING: { current: Resolver | null } = { current: null };

export function token<T>(name: string): Token<T>;
export function token(name: string): symbol {
	return Symbol(name);
}

export function inject<T>(wanted: Token<T>): T {
	const resolver = BUILDING.current;
	if (resolver === null) throw new Error(NOT_BUILDING.replace("{token}", nameOfToken(wanted)));
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

export function nameOfToken(held: symbol): string {
	return held.description ?? "an unnamed token";
}
