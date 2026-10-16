import type { Guard, OpenGuard } from "./guard";
import type { AnyHandler, GuardedState, Handler, Inject } from "./handler";
import type { Added, Middleware, NothingAdded, Step } from "./middleware";
import type { AnyRequest } from "./request";

export type Runs = "client" | "server";

export type Provided = Readonly<Record<string, object>>;

export type NothingProvided = Readonly<Record<never, never>>;

export type Cover = "unguarded" | GuardedState;

export interface ServerParts {
	readonly env: Readonly<Record<string, string | undefined>>;
}

export interface ModuleDefinition {
	readonly name: string;
	readonly runs: Runs;
	readonly steps: readonly Step[];
}

export interface ReadyModule {
	readonly definition: ModuleDefinition;
	readonly handlers: readonly AnyHandler[];
	readonly provide: () => Provided;
}

type ServerHandler = Handler<AnyRequest, Inject, GuardedState>;

type ClientHandler = Handler<AnyRequest, Inject, "client">;

interface ServerPlan<P extends Provided> {
	readonly name: string;
	readonly steps: readonly Step[];
	readonly provide: (parts: ServerParts) => P;
}

const NOTHING_PROVIDED: NothingProvided = Object.freeze({});

export class HandledModule<Q> {
	constructor(
		readonly definition: ModuleDefinition,
		readonly handlers: readonly AnyHandler[],
		private readonly provider: (parts: Q) => Provided,
	) {}

	with(parts: Q): ReadyModule {
		const { definition, handlers, provider } = this;
		return { definition, handlers, provide: () => provider(parts) };
	}
}

export type StartableModule = HandledModule<void> | ReadyModule;

export type StartableServerModule = HandledModule<ServerParts> | ReadyModule;

export class ServerModule<
	P extends Provided = NothingProvided,
	S extends Cover = "unguarded",
	C extends Added = NothingAdded,
> implements ModuleDefinition {
	readonly runs = "server";
	readonly name: string;
	readonly steps: readonly Step[];

	constructor(
		private readonly plan: ServerPlan<P>,
		readonly cover: S,
	) {
		this.name = plan.name;
		this.steps = plan.steps;
	}

	guard(this: ServerModule<P, "unguarded", C>, step: OpenGuard): ServerModule<P, "public", C>;
	guard<A extends Added>(
		this: ServerModule<P, "unguarded" | "guarded", C>,
		step: Guard<unknown, A, Inject, true>,
	): ServerModule<P, "guarded", C & A>;
	guard<A extends Added>(step: Guard<unknown, A, Inject, false>): ServerModule<P, S, C & A>;
	guard(step: Step): ServerModule<P, Cover, Added> {
		return new ServerModule({ ...this.plan, steps: [...this.plan.steps, step] }, coverAfter(this.cover, step));
	}

	use<A extends Added>(step: Middleware<unknown, A, Inject>): ServerModule<P, S, C & A> {
		return new ServerModule({ ...this.plan, steps: [...this.plan.steps, step] }, this.cover);
	}

	provide<N extends Provided>(provide: (parts: ServerParts) => N): ServerModule<N, S, C> {
		return new ServerModule({ ...this.plan, provide }, this.cover);
	}

	handlers(handlers: readonly ServerHandler[]): HandledModule<ServerParts> {
		return new HandledModule(this, handlers, this.plan.provide);
	}
}

export class ClientModule<P extends Provided = NothingProvided, Q = void> implements ModuleDefinition {
	readonly runs = "client";
	readonly steps: readonly Step[] = [];

	constructor(
		readonly name: string,
		private readonly provider: (parts: Q) => P,
	) {}

	provide<N extends Provided, R = void>(provide: (parts: R) => N): ClientModule<N, R> {
		return new ClientModule(this.name, provide);
	}

	handlers(handlers: readonly ClientHandler[]): HandledModule<Q> {
		return new HandledModule(this, handlers, this.provider);
	}
}

export type AnyModule = ClientModule<Provided, never> | ServerModule<Provided, Cover, Added>;

export function serverModule(name: string): ServerModule {
	return new ServerModule({ name, steps: [], provide: () => NOTHING_PROVIDED }, "unguarded");
}

export function clientModule(name: string): ClientModule {
	return new ClientModule(name, () => NOTHING_PROVIDED);
}

export function readyModuleOf<Q>(module: HandledModule<Q> | ReadyModule, parts: Q): ReadyModule {
	return module instanceof HandledModule ? module.with(parts) : module;
}

function coverAfter(cover: Cover, step: Step): Cover {
	if (step.kind === "public") return "public";
	return step.needsUser ? "guarded" : cover;
}
