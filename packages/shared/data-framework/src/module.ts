import { Event } from "./event";
import type { AnyEvent } from "./event";
import type { Guard, OpenGuard } from "./guard";
import type { AnyHandledRequest } from "./handled-request";
import type { AnyHandler, GuardedState, Handler, Inject, Injected } from "./handler";
import { NOTHING_NEEDED, lentFor, withNeeds } from "./host-needs";
import type { HeldBy, HostNeeds, Lent, NeedSets, NeedsShape, OneOf, OneSetLent, OneSetTagged } from "./host-needs";
import { stepGiven } from "./middleware";
import type { Added, Middleware, NothingAdded, Step, StepNeedingOptions, TakesOptionsFirst } from "./middleware";
import type { ModuleContract } from "./module-contract";
import { PlatformModule } from "./platform-module";
import type { AnyPlatformModule, HostFacts, ModuleFacts } from "./platform-module";
import type { Placement } from "./placement";
import type { AnyRequest } from "./request";
import type { AnySubscriber } from "./subscriber";

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
	readonly publicEvents: readonly AnyEvent[];
	readonly ownedEvents: readonly AnyEvent[];
	readonly listedSubscribers: readonly AnySubscriber[];
	readonly hostNeeds: HostNeeds;
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
	readonly publicEvents: readonly AnyEvent[] = [];
	readonly ownedEvents: readonly AnyEvent[] = [];
	readonly listedSubscribers: readonly AnySubscriber[] = [];
	readonly hostNeeds: HostNeeds = NOTHING_NEEDED;

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
	readonly publicEvents: readonly AnyEvent[] = [];
	readonly ownedEvents: readonly AnyEvent[] = [];
	readonly listedSubscribers: readonly AnySubscriber[] = [];
	readonly hostNeeds: HostNeeds = NOTHING_NEEDED;

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

type PublicItem = AnyHandledRequest | AnyEvent;

type RequestsIn<L extends readonly PublicItem[]> = L extends readonly [infer First, ...infer Rest extends PublicItem[]]
	? First extends AnyHandledRequest
		? [First, ...RequestsIn<Rest>]
		: RequestsIn<Rest>
	: [];

interface ModulePlan<R extends Runs> {
	readonly name: string;
	readonly runs: R;
	readonly listed: readonly AnyHandledRequest[];
	readonly serverOnly: readonly AnyHandledRequest[];
	readonly imports: readonly string[];
	readonly steps: readonly Step[];
	readonly publicEvents: readonly AnyEvent[];
	readonly subscribers: readonly AnySubscriber[];
	readonly needs: HostNeeds;
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
			publicEvents: [],
			subscribers: [],
			needs: NOTHING_NEEDED,
		});
	}
}

export class RequestsModule<
	H extends readonly AnyHandledRequest[],
	R extends Runs,
	N extends Provided = NothingProvided,
	G extends Lent = N,
> implements ModuleDefinition {
	readonly name: string;
	readonly runs: R;
	readonly steps: readonly Step[];
	readonly serverOnlyRequestNames: readonly string[];
	readonly importedModuleNames: readonly string[];
	readonly publicEvents: readonly AnyEvent[];
	readonly ownedEvents: readonly AnyEvent[];
	readonly listedSubscribers: readonly AnySubscriber[];
	readonly hostNeeds: HostNeeds;

	constructor(private readonly plan: ModulePlan<R>) {
		this.name = plan.name;
		this.runs = plan.runs;
		this.steps = plan.steps;
		this.serverOnlyRequestNames = plan.serverOnly.map(({ request }) => request.inModule(plan.name).name);
		this.importedModuleNames = plan.imports;
		this.publicEvents = plan.publicEvents.map((listed) => listed.inModule(plan.name));
		this.listedSubscribers = plan.subscribers.map((listed) => subscriberInModule(listed, plan.name));
		this.ownedEvents = ownedEventsOf(this.publicEvents, this.listedSubscribers, plan.name);
		this.hostNeeds = plan.needs;
	}

	public<const L extends readonly PublicItem[]>(...listed: L): RequestsModule<[...H, ...RequestsIn<L>], R, N, G> {
		return new RequestsModule({
			...this.plan,
			listed: this.withListed(listed.filter(isHandledRequest)),
			publicEvents: [...this.plan.publicEvents, ...listed.filter(isEvent)],
		});
	}

	serverOnly<const L extends readonly AnyHandledRequest[]>(
		...listed: ServerOnlyListed<R, L>
	): RequestsModule<[...H, ...L], R, N, G> {
		const requests = listed.filter(isHandledRequest);
		return new RequestsModule({
			...this.plan,
			listed: this.withListed(requests),
			serverOnly: [...this.plan.serverOnly, ...requests],
		});
	}

	imports(...modules: readonly ImportedModule[]): RequestsModule<H, R, N, G> {
		return new RequestsModule({
			...this.plan,
			imports: [...this.plan.imports, ...modules.map(nameOfImported)],
		});
	}

	subscribers(...subscribers: readonly AnySubscriber[]): RequestsModule<H, R, N, G> {
		return new RequestsModule({
			...this.plan,
			subscribers: [...this.plan.subscribers, ...subscribers],
		});
	}

	needs<const S extends NeedSets>(needs: OneOf<S>): RequestsModule<H, R, N & OneSetLent<S>, G & OneSetTagged<S>>;
	needs<const M extends NeedsShape>(needs: M): RequestsModule<H, R, N & HeldBy<M>, G & HeldBy<M>>;
	needs(needs: NeedsShape | OneOf<NeedSets>): RequestsModule<H, R, Provided, Lent> {
		return new RequestsModule({
			...this.plan,
			needs: withNeeds(this.plan.name, this.plan.needs, needs),
		});
	}

	guard<A extends Added>(step: Guard<unknown, A, Inject> | OpenGuard): RequestsModule<H, R, N, G>;
	guard(step: StepNeedingOptions): TakesOptionsFirst;
	guard(step: Step | StepNeedingOptions): RequestsModule<H, R, N, G> | TakesOptionsFirst {
		return new RequestsModule({
			...this.plan,
			steps: [...this.plan.steps, stepGiven(step)],
		});
	}

	use<A extends Added>(step: Middleware<unknown, A, Inject>): RequestsModule<H, R, N, G>;
	use(step: StepNeedingOptions): TakesOptionsFirst;
	use(step: Step | StepNeedingOptions): RequestsModule<H, R, N, G> | TakesOptionsFirst {
		return new RequestsModule({
			...this.plan,
			steps: [...this.plan.steps, stepGiven(step)],
		});
	}

	provide(provide: (facts: HostFacts<G>) => NeedsOf<H>): PlatformModule<NeedsOf<H>, R, N> {
		const { name } = this.plan;
		const handlers = this.plan.listed.map((listed) => ({
			...listed,
			request: listed.request.inModule(name),
			emits: listed.emits.map((emitted) => emitted.inModule(name)),
			module: this,
		}));
		return new PlatformModule(this, handlers, { provide });
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

	return {
		...facts,
		host: lentFor(definition.name, definition.hostNeeds, facts.host),
	};
}

function coverAfter(cover: Cover, step: Step): Cover {
	if (step.kind === "public") return "public";
	return step.needsUser ? "guarded" : cover;
}

function isHandledRequest(listed: PublicItem | string): listed is AnyHandledRequest {
	return typeof listed !== "string" && !isEvent(listed);
}

function isEvent(listed: PublicItem): listed is AnyEvent {
	return listed instanceof Event;
}

function ownedEventsOf(
	publicEvents: readonly AnyEvent[],
	subscribers: readonly AnySubscriber[],
	module: string,
): readonly AnyEvent[] {
	const heardOwn = subscribers.map(({ event }) => event).filter((heard) => heard.module === module);
	return [...new Map([...publicEvents, ...heardOwn].map((owned) => [owned.name, owned])).values()];
}

function nameOfImported(imported: ImportedModule): string {
	return imported instanceof PlatformModule ? imported.definition.name : imported.name;
}

function subscriberInModule(listed: AnySubscriber, module: string): AnySubscriber {
	return {
		...listed,
		event: listed.event.inModule(module),
		emits: listed.emits.map((emitted) => emitted.inModule(module)),
	};
}
