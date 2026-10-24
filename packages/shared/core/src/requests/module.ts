import type { Guard, OpenGuard } from "./guard";
import type { AnyHandledRequest, HandledRequest } from "./handled-request";
import type { AnyHandler, GuardedState, Handler, Inject, Injected } from "./handler";
import type { Added, Middleware, NothingAdded, Step } from "./middleware";
import { PlatformModule } from "./platform-module";
import type { AnyPlatformModule, ModuleFacts } from "./platform-module";
import type { AnyCommand, AnyQuery, AnyRequest } from "./request";

export type Side = "client" | "server";

export type Runs = Side | "anywhere";

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

export type StartableModule = HandledModule<void> | ReadyModule | AnyPlatformModule;

export type StartableServerModule = HandledModule<ServerParts> | ReadyModule | AnyPlatformModule;

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

type HandledQuery = HandledRequest<AnyQuery, Inject, Added>;

type HandledCommand = HandledRequest<AnyCommand, Inject, Added>;

type InjectedBy<T> = T extends { readonly inject: infer D extends Inject } ? Injected<D> : never;

type IntersectionOf<U> = (U extends unknown ? (union: U) => void : never) extends (all: infer I) => void ? I : never;

export type NeedsOf<H extends readonly AnyHandledRequest[]> = Provided & IntersectionOf<InjectedBy<H[number]>>;

const NO_FACTS =
	'module "{module}" picks its parts from the platform and scope, and its starter was told neither: pass platform and scope';
const NOT_A_QUERY = 'module "{module}" lists {request} under .queries(), but it is a command';
const NOT_A_COMMAND = 'module "{module}" lists {request} under .commands(), but it is a query';

export class RequestsModule<H extends readonly AnyHandledRequest[]> implements ModuleDefinition {
	readonly runs = "anywhere";

	constructor(
		readonly name: string,
		readonly listed: H,
		readonly steps: readonly Step[],
	) {}

	queries<const Q extends readonly HandledQuery[]>(...queries: Q): RequestsModule<[...H, ...Q]> {
		return new RequestsModule(this.name, [...this.listed, ...this.refuseWrongKind(queries, "query")], this.steps);
	}

	commands<const M extends readonly HandledCommand[]>(...commands: M): RequestsModule<[...H, ...M]> {
		return new RequestsModule(this.name, [...this.listed, ...this.refuseWrongKind(commands, "command")], this.steps);
	}

	guard<A extends Added>(step: Guard<unknown, A, Inject> | OpenGuard): RequestsModule<H> {
		return new RequestsModule(this.name, this.listed, [...this.steps, step]);
	}

	use<A extends Added>(step: Middleware<unknown, A, Inject>): RequestsModule<H> {
		return new RequestsModule(this.name, this.listed, [...this.steps, step]);
	}

	provide(provide: (facts: ModuleFacts) => NeedsOf<H>): PlatformModule<NeedsOf<H>> {
		const handlers = this.listed.map((listed) => ({
			...listed,
			request: listed.request.inModule(this.name),
			sends: listed.sends.map((sent) => sent.inModule(this.name)),
			module: this,
		}));
		return new PlatformModule(this, handlers, provide);
	}

	private refuseWrongKind<L extends readonly AnyHandledRequest[]>(listed: L, kind: AnyRequest["kind"]): L {
		const wrong = listed.find(({ request }) => request.kind !== kind);

		if (wrong === undefined) {
			return listed;
		}

		const template = kind === "query" ? NOT_A_QUERY : NOT_A_COMMAND;
		throw new Error(template.replace("{module}", this.name).replace("{request}", wrong.request.name));
	}
}

export function module(name: string): RequestsModule<[]> {
	return new RequestsModule(name, [], []);
}

export type AnyModule = ClientModule<Provided, never> | ServerModule<Provided, Cover, Added>;

export function serverModule(name: string): ServerModule {
	return new ServerModule({ name, steps: [], provide: () => NOTHING_PROVIDED }, "unguarded");
}

export function clientModule(name: string): ClientModule {
	return new ClientModule(name, () => NOTHING_PROVIDED);
}

export function readyModuleOf<Q>(
	module: HandledModule<Q> | ReadyModule | AnyPlatformModule,
	parts: Q,
	facts: ModuleFacts | null,
): ReadyModule {
	if (module instanceof PlatformModule) {
		return module.startedOn(factsFor(module.definition, facts));
	}

	return module instanceof HandledModule ? module.with(parts) : module;
}

function factsFor(definition: ModuleDefinition, facts: ModuleFacts | null): ModuleFacts {
	if (facts === null) {
		throw new Error(NO_FACTS.replace("{module}", definition.name));
	}

	return facts;
}

function coverAfter(cover: Cover, step: Step): Cover {
	if (step.kind === "public") return "public";
	return step.needsUser ? "guarded" : cover;
}
