import type { AnyHandler } from "./handler";
import { isObject } from "./is-object";
import type {
	HandlingDefinition,
	ModuleItem,
	NothingProvided,
	Provided,
	ReadyModule,
	Runs,
	ServerParts,
} from "./module";

export type Platform = "tauri" | "browser" | "server";

export interface ModuleScope {
	readonly workspaceId: string;
}

export interface ModuleFacts extends ServerParts {
	readonly platform: Platform;
	readonly scope: ModuleScope;
}

export type NoConfig = Readonly<Record<never, never>>;

export type ModuleConfig = object & { readonly injects?: never };

export interface ModuleWithInjects {
	readyWith(injects: never): ReadyModule;
}

export type ConfigFacts<C> = ModuleFacts & { readonly config: C };

export interface RunnableModule<P extends Provided, R extends Runs = Runs> {
	readonly definition: HandlingDefinition<R>;
	readonly handlers: readonly AnyHandler[];
	readyWith(injects: P): ReadyModule;
	startedOn(facts: ModuleFacts): ReadyModule;
}

export type ModuleSurface<P extends Provided, R extends Runs> = Pick<
	RunnableModule<P, R>,
	"definition" | "handlers" | "readyWith"
>;

export interface InjectsUse<P extends Provided> {
	readonly injects: P;
}

export interface ModuleCall<P extends Provided, R extends Runs, C> {
	(use: InjectsUse<P>): ReadyModule;
	(config: C): RunnableModule<P, R>;
}

export interface ModuleHandles<P extends Provided, R extends Runs, C> {
	handles(...items: readonly ModuleItem[]): ModuleOf<P, R, C>;
}

export type CallableModule<P extends Provided, R extends Runs, C> = RunnableModule<P, R> &
	ModuleCall<P, R, C> &
	ModuleHandles<P, R, C>;

export type ModuleOf<P extends Provided, R extends Runs, C> = NoConfig extends C
	? CallableModule<P, R, C>
	: ModuleSurface<P, R> & ModuleCall<P, R, C> & ModuleHandles<P, R, C>;

export type ProvidedOf<M> = M extends { readyWith(injects: infer P extends Provided): ReadyModule } ? P : NothingProvided;

interface Provider<P extends Provided> {
	provide(facts: ConfigFacts<unknown>): P;
}

const NO_CONFIG: NoConfig = Object.freeze({});
const INJECTS_NOT_OBJECT = "a module called with { injects } takes the object of its provided parts as injects";

export class PlatformModule<P extends Provided, R extends Runs = Runs> implements RunnableModule<P, R> {
	constructor(
		readonly definition: HandlingDefinition<R>,
		private readonly provider: Provider<P>,
		private readonly config: unknown = NO_CONFIG,
	) {}

	get handlers(): readonly AnyHandler[] {
		return this.definition.handlers;
	}

	configured(config: unknown): PlatformModule<P, R> {
		return new PlatformModule(this.definition, this.provider, config);
	}

	handles(...items: readonly ModuleItem[]): PlatformModule<P, R> {
		return new PlatformModule(this.definition.withItems(items), this.provider, this.config);
	}

	readyWith(injects: P): ReadyModule {
		const { definition, handlers } = this;
		return { definition, handlers, provide: () => injects };
	}

	startedOn(facts: ModuleFacts): ReadyModule {
		const { definition, handlers, provider, config } = this;
		return { definition, handlers, provide: () => provider.provide({ ...facts, config }) };
	}

	callable<C>(): CallableModule<P, R, C> {
		return Object.assign(createModuleCall<P, R, C>(this), {
			definition: this.definition,
			handlers: this.handlers,
			readyWith: (injects: P): ReadyModule => this.readyWith(injects),
			startedOn: (facts: ModuleFacts): ReadyModule => this.startedOn(facts),
			handles: (...items: readonly ModuleItem[]): CallableModule<P, R, C> => this.handles(...items).callable<C>(),
		});
	}
}

function createModuleCall<P extends Provided, R extends Runs, C>(platform: PlatformModule<P, R>): ModuleCall<P, R, C> {
	function called(use: InjectsUse<P>): ReadyModule;
	function called(config: C): RunnableModule<P, R>;
	function called(given: InjectsUse<P> | C): ReadyModule | RunnableModule<P, R> {
		return isInjectsUse<P>(given) ? platform.readyWith(given.injects) : platform.configured(given);
	}

	return called;
}

function isInjectsUse<P extends Provided>(given: unknown): given is InjectsUse<P> {
	if (!isObject(given) || !("injects" in given)) {
		return false;
	}

	if (!isObject(given["injects"])) {
		throw new Error(INJECTS_NOT_OBJECT);
	}

	return true;
}

export type AnyPlatformModule = RunnableModule<Provided>;

export function isRunnableModule(held: object): held is AnyPlatformModule {
	return "startedOn" in held && typeof held.startedOn === "function";
}
