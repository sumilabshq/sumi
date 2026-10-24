import type { AnyHandler } from "./handler";
import type { Lent } from "./host-needs";
import type { ModuleDefinition, NothingProvided, Provided, ReadyModule, Runs, ServerParts } from "./module";

export type Platform = "tauri" | "browser" | "server";

export interface ModuleScope {
	readonly workspaceId: string;
}

export interface ModuleFacts extends ServerParts {
	readonly platform: Platform;
	readonly scope: ModuleScope;
	readonly host: Lent;
}

export type HostFacts<N extends Lent> = Omit<ModuleFacts, "host"> & { readonly host: N };

interface Provider<P extends Provided> {
	provide(facts: ModuleFacts): P;
}

export class PlatformModule<P extends Provided, R extends Runs = Runs, N extends Provided = NothingProvided> {
	declare readonly hostNeedsType?: N;

	constructor(
		readonly definition: ModuleDefinition & { readonly runs: R },
		readonly handlers: readonly AnyHandler[],
		private readonly provider: Provider<P>,
	) {}

	with(parts: P): ReadyModule {
		const { definition, handlers } = this;
		return { definition, handlers, provide: () => parts };
	}

	startedOn(facts: ModuleFacts): ReadyModule {
		const { definition, handlers, provider } = this;
		return { definition, handlers, provide: () => provider.provide(facts) };
	}
}

export type AnyPlatformModule = PlatformModule<Provided>;
