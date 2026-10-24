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

export class PlatformModule<P extends Provided, R extends Runs = Runs> {
	constructor(
		readonly definition: ModuleDefinition & { readonly runs: R },
		readonly handlers: readonly AnyHandler[],
		private readonly provider: (facts: ModuleFacts) => P,
	) {}

	with(parts: P): ReadyModule {
		const { definition, handlers } = this;
		return { definition, handlers, provide: () => parts };
	}

	startedOn(facts: ModuleFacts): ReadyModule {
		const { definition, handlers, provider } = this;
		return { definition, handlers, provide: () => provider(facts) };
	}
}

export type AnyPlatformModule = PlatformModule<Provided>;
