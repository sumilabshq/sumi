import { Event } from "./event";
import type { AnyEvent } from "./event";
import type { Guard, OpenGuard } from "./guard";
import type { AnyHandledRequest } from "./handled-request";
import type { AnyHandler, GuardedState, Handler, Inject } from "./handler";
import { requireStep } from "./middleware";
import type { Added, Middleware, NothingAdded, Step, StepNeedingOptions, TakesOptionsFirst } from "./middleware";
import type { ModuleContract } from "./module-contract";
import { PlatformModule, isRunnableModule } from "./platform-module";
import type {
	AnyPlatformModule,
	CallableModule,
	ConfigFacts,
	ModuleConfig,
	ModuleFacts,
	ModuleOf,
	NoConfig,
} from "./platform-module";
import type { Placement } from "./placement";
import { nameOfModule } from "./request";
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
	readonly importedModuleNames: readonly string[];
	readonly ownedEvents: readonly AnyEvent[];
	readonly listedSubscribers: readonly AnySubscriber[];
}

export type ModuleItem = AnyHandledRequest | AnyEvent | AnySubscriber;

export interface HandlingDefinition<R extends Runs = Runs> extends ModuleDefinition {
	readonly runs: R;
	readonly handlers: readonly AnyHandler[];
	withItems(items: readonly ModuleItem[]): HandlingDefinition<R>;
}

export type ImportedModule = ModuleContract | AnyPlatformModule;

export interface ReadyModule {
	readonly definition: ModuleDefinition;
	readonly handlers: readonly AnyHandler[];
	readonly provide: () => Provided;
}

type ServerHandler = Handler<AnyRequest, object, GuardedState>;

type ClientHandler = Handler<AnyRequest, object, "client">;

interface ServerPlan<P extends Provided> {
	readonly name: string;
	readonly steps: readonly Step[];
	readonly provide: (parts: ServerParts) => P;
}

const NOTHING_PROVIDED: NothingProvided = Object.freeze({});

interface PartsProvider<Q> {
	provide(parts: Q): Provided;
}

export class HandledModule<Q> {
	// TRADE-OFF: a method-shaped provider keeps Q bivariant, so one runtime list holds void and ServerParts modules
	private readonly provider: PartsProvider<Q>;

	constructor(
		readonly definition: ModuleDefinition,
		readonly handlers: readonly AnyHandler[],
		provide: (parts: Q) => Provided,
	) {
		this.provider = { provide };
	}

	with(parts: Q): ReadyModule {
		const { definition, handlers, provider } = this;
		return { definition, handlers, provide: () => provider.provide(parts) };
	}
}

export type StartableModule = HandledModule<ServerParts | void> | ReadyModule | AnyPlatformModule;

export class ServerModule<
	P extends Provided = NothingProvided,
	S extends Cover = "unguarded",
	C extends Added = NothingAdded,
> implements ModuleDefinition {
	readonly runs = "server";
	readonly name: string;
	readonly steps: readonly Step[];
	readonly importedModuleNames: readonly string[] = [];
	readonly ownedEvents: readonly AnyEvent[] = [];
	readonly listedSubscribers: readonly AnySubscriber[] = [];

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
	readonly importedModuleNames: readonly string[] = [];
	readonly ownedEvents: readonly AnyEvent[] = [];
	readonly listedSubscribers: readonly AnySubscriber[] = [];

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

interface ModulePlan<R extends Runs> {
	readonly name: string;
	readonly runs: R;
	readonly imports: readonly string[];
	readonly steps: readonly Step[];
	readonly listed: readonly AnyHandledRequest[];
	readonly events: readonly AnyEvent[];
	readonly subscribers: readonly AnySubscriber[];
}

const NO_FACTS =
	'module "{module}" picks its parts from the platform and scope, and its starter was told neither: pass platform and scope';
const LISTED_TWICE = 'module "{module}" handles {request} twice: a request belongs to one module, once';
const SUBSCRIBER_LISTED_TWICE = 'module "{module}" lists a subscriber of {event} twice: list each subscriber once';

export class ModuleDraft {
	constructor(readonly name: string) {}

	on<R extends Runs>(placement: Placement<R>): RequestsModule<R> {
		return new RequestsModule({
			name: this.name,
			runs: placement.runs,
			imports: [],
			steps: [],
			listed: [],
			events: [],
			subscribers: [],
		});
	}
}

export class RequestsModule<R extends Runs, C extends object = NoConfig> implements HandlingDefinition<R> {
	readonly name: string;
	readonly runs: R;
	readonly steps: readonly Step[];
	readonly importedModuleNames: readonly string[];
	readonly ownedEvents: readonly AnyEvent[];
	readonly listedSubscribers: readonly AnySubscriber[];
	readonly handlers: readonly AnyHandler[];

	constructor(private readonly plan: ModulePlan<R>) {
		this.name = plan.name;
		this.runs = plan.runs;
		this.steps = plan.steps;
		this.importedModuleNames = plan.imports;
		this.listedSubscribers = plan.subscribers.map((listed) => subscriberInModule(listed, plan.name));
		this.ownedEvents = ownedEventsOf(
			plan.events.map((listed) => listed.inModule(plan.name)),
			this.listedSubscribers,
			plan.name,
		);
		this.handlers = plan.listed.map((listed) => ({
			...listed,
			request: listed.request.inModule(plan.name),
			module: this,
		}));
	}

	imports(...modules: readonly ImportedModule[]): RequestsModule<R, C> {
		return new RequestsModule({
			...this.plan,
			imports: [...this.plan.imports, ...modules.map(nameOfModule)],
		});
	}

	config<K extends ModuleConfig>(): RequestsModule<R, K> {
		return new RequestsModule(this.plan);
	}

	guard<A extends Added>(step: Guard<unknown, A, Inject> | OpenGuard): RequestsModule<R, C>;
	guard(step: StepNeedingOptions): TakesOptionsFirst;
	guard(step: Step | StepNeedingOptions): RequestsModule<R, C> | TakesOptionsFirst {
		return new RequestsModule({
			...this.plan,
			steps: [...this.plan.steps, requireStep(step)],
		});
	}

	use<A extends Added>(step: Middleware<unknown, A, Inject>): RequestsModule<R, C>;
	use(step: StepNeedingOptions): TakesOptionsFirst;
	use(step: Step | StepNeedingOptions): RequestsModule<R, C> | TakesOptionsFirst {
		return new RequestsModule({
			...this.plan,
			steps: [...this.plan.steps, requireStep(step)],
		});
	}

	provide<P extends Provided>(provide: (facts: ConfigFacts<C>) => P): ModuleOf<P, R, C>;
	provide<P extends Provided>(provide: (facts: ConfigFacts<C>) => P): CallableModule<P, R, C> {
		return new PlatformModule<P, R>(this, { provide }).callable<C>();
	}

	withItems(items: readonly ModuleItem[]): RequestsModule<R, C> {
		return new RequestsModule({
			...this.plan,
			listed: this.withListed(items.filter(isHandledRequest)),
			events: [...this.plan.events, ...items.filter(isEvent)],
			subscribers: this.withSubscribers(items.filter(isSubscriber)),
		});
	}

	private withSubscribers(subscribers: readonly AnySubscriber[]): readonly AnySubscriber[] {
		const listed = [...this.plan.subscribers];

		for (const subscriber of subscribers) {
			if (listed.includes(subscriber)) {
				const said = SUBSCRIBER_LISTED_TWICE.replace("{module}", this.plan.name);
				throw new Error(said.replace("{event}", subscriber.event.name));
			}

			listed.push(subscriber);
		}

		return listed;
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
	if (module instanceof HandledModule) {
		return module.with(parts);
	}

	if (!isRunnableModule(module)) {
		return module;
	}

	if (facts === null) {
		throw new Error(NO_FACTS.replace("{module}", module.definition.name));
	}

	return module.startedOn(facts);
}

function coverAfter(cover: Cover, step: Step): Cover {
	if (step.kind === "public") return "public";
	return step.needsUser ? "guarded" : cover;
}

function isHandledRequest(item: ModuleItem): item is AnyHandledRequest {
	return "request" in item;
}

function isEvent(item: ModuleItem): item is AnyEvent {
	return item instanceof Event;
}

function isSubscriber(item: ModuleItem): item is AnySubscriber {
	return "kind" in item && item.kind === "subscriber";
}

function ownedEventsOf(
	events: readonly AnyEvent[],
	subscribers: readonly AnySubscriber[],
	module: string,
): readonly AnyEvent[] {
	const heardOwn = subscribers.map(({ event }) => event).filter((heard) => heard.module === module);
	return [...new Map([...events, ...heardOwn].map((owned) => [owned.name, owned])).values()];
}

function subscriberInModule(listed: AnySubscriber, module: string): AnySubscriber {
	return {
		...listed,
		event: listed.event.inModule(module),
	};
}
