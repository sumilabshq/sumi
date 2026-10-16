import type { HandlerClass, Middleware } from "./handles";
import { PLATFORMS } from "./platform";
import type { AppPlatform, Platform } from "./platform";
import type { Provided, Token } from "./token";

export interface Module<Covers extends AppPlatform = AppPlatform> {
	readonly name: string;
	readonly handlers: readonly HandlerClass[];
	readonly provide: readonly Provided[];
	readonly imports: readonly Module[];
	readonly exports: readonly Token<unknown>[];
	readonly use: readonly Middleware[];
	readonly covers: readonly Covers[];
}

export interface ModuleDeclaration {
	readonly name: string;
	readonly handlers: readonly HandlerClass[];
	readonly provide?: readonly Provided[];
	readonly imports?: readonly Module[];
	readonly exports?: readonly Token<unknown>[];
	readonly use?: readonly Middleware[];
}

type ServerOnly<P extends Platform> = [P] extends ["server"] ? true : false;

export type CoveredBy<L> = L extends readonly [infer First, ...infer Rest]
	? First extends Provided<unknown, infer P>
		? ServerOnly<P> extends true
			? CoveredBy<Rest>
			: Extract<P, AppPlatform> & CoveredBy<Rest>
		: never
	: AppPlatform;

type ProvideOf<D extends ModuleDeclaration> = D["provide"] extends readonly Provided[] ? D["provide"] : readonly [];

const NONE: readonly never[] = [];

export function module<const D extends ModuleDeclaration>(declared: D): Module<CoveredBy<ProvideOf<D>>>;
export function module(declared: ModuleDeclaration): Module {
	const provide = declared.provide ?? NONE;
	return {
		name: declared.name,
		handlers: declared.handlers,
		provide,
		imports: declared.imports ?? NONE,
		exports: declared.exports ?? NONE,
		use: declared.use ?? NONE,
		covers: APP_PLATFORMS.filter((platform) =>
			provide.every((pair) => isServerOnly(pair) || pair.platforms.includes(platform)),
		),
	};
}

export function isServerOnly(pair: Provided): boolean {
	return pair.platforms.every((platform) => platform === "server");
}

const APP_PLATFORMS = PLATFORMS.filter((platform): platform is AppPlatform => platform !== "server");
