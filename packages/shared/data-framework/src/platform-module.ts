import type { AnyHandler } from "./handler";
import type { ModuleDefinition, Provided, ReadyModule, Runs, ServerParts } from "./module";

export type Platform = "tauri" | "browser" | "server";

export interface ModuleScope {
	readonly workspaceId: string;
}

export interface ModuleFacts extends ServerParts {
	readonly platform: Platform;
	readonly scope: ModuleScope;
}

export type NoConfig = Readonly<Record<never, never>>;

export type ConfigFacts<C> = ModuleFacts & { readonly config: C };

export interface RunnableModule<P extends Provided, R extends Runs = Runs> {
	readonly definition: ModuleDefinition & { readonly runs: R };
	readonly handlers: readonly AnyHandler[];
	with(parts: P): ReadyModule;
	startedOn(facts: ModuleFacts): ReadyModule;
}

export type ModuleSurface<P extends Provided, R extends Runs> = Pick<
	RunnableModule<P, R>,
	"definition" | "handlers" | "with"
>;

export type ModuleCall<P extends Provided, R extends Runs, C> = (config: C) => RunnableModule<P, R>;

export type CallableModule<P extends Provided, R extends Runs, C> = RunnableModule<P, R> & ModuleCall<P, R, C>;

export type ModuleOf<P extends Provided, R extends Runs, C> = NoConfig extends C
	? CallableModule<P, R, C>
	: ModuleSurface<P, R> & ModuleCall<P, R, C>;

interface Provider<P extends Provided> {
	provide(facts: ConfigFacts<unknown>): P;
}

const NO_CONFIG: NoConfig = Object.freeze({});

export class PlatformModule<P extends Provided, R extends Runs = Runs> implements RunnableModule<P, R> {
	constructor(
		readonly definition: ModuleDefinition & { readonly runs: R },
		readonly handlers: readonly AnyHandler[],
		private readonly provider: Provider<P>,
		private readonly config: unknown = NO_CONFIG,
	) {}

	configured(config: unknown): PlatformModule<P, R> {
		return new PlatformModule(this.definition, this.handlers, this.provider, config);
	}

	with(parts: P): ReadyModule {
		const { definition, handlers } = this;
		return { definition, handlers, provide: () => parts };
	}

	startedOn(facts: ModuleFacts): ReadyModule {
		const { definition, handlers, provider, config } = this;
		return { definition, handlers, provide: () => provider.provide({ ...facts, config }) };
	}

	callable<C>(): CallableModule<P, R, C> {
		return Object.assign((config: C): RunnableModule<P, R> => this.configured(config), {
			definition: this.definition,
			handlers: this.handlers,
			with: (parts: P): ReadyModule => this.with(parts),
			startedOn: (facts: ModuleFacts): ReadyModule => this.startedOn(facts),
		});
	}
}

export type AnyPlatformModule = RunnableModule<Provided>;

export function isRunnableModule(held: object): held is AnyPlatformModule {
	return "startedOn" in held && typeof held.startedOn === "function";
}
