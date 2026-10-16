import type { AnyHandler, Handler, Inject, Injected } from "./handler";
import type { GuardedRequest } from "./request";

export type Runs = "client" | "server";

export type Provided = Readonly<Record<string, object>>;

export interface ReadyModule {
	readonly name: string;
	readonly runs: Runs;
	readonly handlers: readonly AnyHandler[];
	readonly provide: () => Provided;
}

export interface Module<P> {
	readonly name: string;
	readonly runs: Runs;
	readonly handlers: readonly AnyHandler[];
	readonly with: (parts: P) => ReadyModule;
}

export type StartableModule = Module<void> | ReadyModule;

export interface ServerParts {
	readonly env: Readonly<Record<string, string | undefined>>;
}

type InjectedBy<H> = H extends Handler<infer _R, infer D extends Inject> ? Injected<D> : never;

type Joined<U> = (U extends unknown ? (joined: U) => void : never) extends (joined: infer I) => void ? I : never;

type NeededBy<H extends readonly AnyHandler[]> = Joined<InjectedBy<H[number]>> & Provided;

type ServerHandler = Handler<GuardedRequest, Inject>;

interface ModuleDefinition<P, H extends readonly AnyHandler[], R extends Runs> {
	readonly runs: R;
	readonly handlers: H;
	readonly provide?: (parts: P) => NeededBy<H>;
}

const NOTHING_PROVIDED: Provided = Object.freeze({});

export function module<P = void, const H extends readonly ServerHandler[] = readonly ServerHandler[]>(
	name: string,
	definition: ModuleDefinition<P, H, "server">,
): Module<P>;
export function module<P = void, const H extends readonly AnyHandler[] = readonly AnyHandler[]>(
	name: string,
	definition: ModuleDefinition<P, H, "client">,
): Module<P>;
export function module<P>(
	name: string,
	{ runs, handlers, provide }: ModuleDefinition<P, readonly AnyHandler[], Runs>,
): Module<P> {
	return {
		name,
		runs,
		handlers,
		with: (parts) => ({ name, runs, handlers, provide: () => (provide ? provide(parts) : NOTHING_PROVIDED) }),
	};
}

export function readyModuleOf<P>(module: Module<P> | ReadyModule, parts: P): ReadyModule {
	return "with" in module ? module.with(parts) : module;
}
