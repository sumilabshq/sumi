import type { Guard, OpenGuard } from "./guard";
import type { AnyHandledRequest } from "./handled-request";
import type { AnyHandler, GuardedState, Handler, Inject, Injected } from "./handler";
import type { Added, Middleware, NothingAdded, Step } from "./middleware";
import type { ModuleContract } from "./module-contract";
import { PlatformModule } from "./platform-module";
import type { AnyPlatformModule, ModuleFacts } from "./platform-module";
import type { Placement } from "./placement";
import type { AnyRequest } from "./request";

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
	readonly serverOnlyRequestNames: readonly string[];
	readonly importedModuleNames: readonly string[];
}

export type ImportedModule = ModuleContract | AnyPlatformModule;

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
	readonly serverOnlyRequestNames: readonly string[] = [];
	readonly importedModuleNames: readonly string[] = [];

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
	readonly serverOnlyRequestNames: readonly string[] = [];
	readonly importedModuleNames: readonly string[] = [];

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

type InjectedBy<T> = T extends { readonly inject: infer D extends Inject } ? Injected<D> : never;

type IntersectionOf<U> = (U extends unknown ? (union: U) => void : never) extends (all: infer I) => void ? I : never;

export type NeedsOf<H extends readonly AnyHandledRequest[]> = Provided & IntersectionOf<InjectedBy<H[number]>>;

interface ModulePlan<R extends Runs> {
	readonly name: string;
	readonly runs: R;
	readonly listed: readonly AnyHandledRequest[];
	readonly serverOnly: readonly AnyHandledRequest[];
	readonly imports: readonly string[];
	readonly steps: readonly Step[];
}

type ServerOnlyListed<R extends Runs, L> = R extends "client"
	? [error: "serverOnly needs .on(Server) or .on(Anywhere): a device module has nothing only a server may call"]
	: L;

const NO_FACTS =
	'module "{module}" picks its parts from the platform and scope, and its starter was told neither: pass platform and scope';
const LISTED_TWICE =
	'module "{module}" lists {request} twice: a request stands in exactly one of .public() and .serverOnly()';

export class ModuleDraft {
	constructor(readonly name: string) {}

	on<R extends Runs>(placement: Placement<R>): RequestsModule<[], R> {
		return new RequestsModule({
			name: this.name,
			runs: placement.runs,
			listed: [],
			serverOnly: [],
			imports: [],
			steps: [],
		});
	}
}

export class RequestsModule<H extends readonly AnyHandledRequest[], R extends Runs> implements ModuleDefinition {
	readonly name: string;
	readonly runs: R;
	readonly steps: readonly Step[];
	readonly serverOnlyRequestNames: readonly string[];
	readonly importedModuleNames: readonly string[];

	constructor(private readonly plan: ModulePlan<R>) {
		this.name = plan.name;
		this.runs = plan.runs;
		this.steps = plan.steps;
		this.serverOnlyRequestNames = plan.serverOnly.map(({ request }) => request.inModule(plan.name).name);
		this.importedModuleNames = plan.imports;
	}

	public<const L extends readonly AnyHandledRequest[]>(...requests: L): RequestsModule<[...H, ...L], R> {
		return new RequestsModule({
			...this.plan,
			listed: this.withListed(requests),
		});
	}

	serverOnly<const L extends readonly AnyHandledRequest[]>(
		...listed: ServerOnlyListed<R, L>
	): RequestsModule<[...H, ...L], R> {
		const requests = listed.filter(isHandledRequest);
		return new RequestsModule({
			...this.plan,
			listed: this.withListed(requests),
			serverOnly: [...this.plan.serverOnly, ...requests],
		});
	}

	imports(...modules: readonly ImportedModule[]): RequestsModule<H, R> {
		return new RequestsModule({
			...this.plan,
			imports: [...this.plan.imports, ...modules.map(nameOfImported)],
		});
	}

	guard<A extends Added>(step: Guard<unknown, A, Inject> | OpenGuard): RequestsModule<H, R> {
		return new RequestsModule({
			...this.plan,
			steps: [...this.plan.steps, step],
		});
	}

	use<A extends Added>(step: Middleware<unknown, A, Inject>): RequestsModule<H, R> {
		return new RequestsModule({
			...this.plan,
			steps: [...this.plan.steps, step],
		});
	}

	provide(provide: (facts: ModuleFacts) => NeedsOf<H>): PlatformModule<NeedsOf<H>, R> {
		const handlers = this.plan.listed.map((listed) => ({
			...listed,
			request: listed.request.inModule(this.plan.name),
			sends: listed.sends.map((sent) => sent.inModule(this.plan.name)),
			module: this,
		}));
		return new PlatformModule(this, handlers, provide);
	}

	private withListed(requests: readonly AnyHandledRequest[]): readonly AnyHandledRequest[] {
		const listed = [...this.plan.listed];

		for (const request of requests) {
			if (listed.some((held) => held.request.name === request.request.name)) {
				const said = LISTED_TWICE.replace("{module}", this.plan.name);
				throw new Error(said.replace("{request}", request.request.name));
			}

			listed.push(request);
		}

		return listed;
	}
}

export function module(name: string): ModuleDraft {
	return new ModuleDraft(name);
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

function isHandledRequest(listed: AnyHandledRequest | string): listed is AnyHandledRequest {
	return typeof listed !== "string";
}

function nameOfImported(imported: ImportedModule): string {
	return imported instanceof PlatformModule ? imported.definition.name : imported.name;
}
