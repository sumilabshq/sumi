import type { Route } from "./local-routes";
import type { Provided, ReadyModule } from "./module";

export interface ModuleRoutes {
	readonly module: ReadyModule;
	readonly provides: Provided;
	readonly provided: Provided;
	readonly routes: readonly Route[];
}

export function moduleRoutesOf(module: ReadyModule, hostProvided: Provided): ModuleRoutes {
	const provides = module.provide();
	const provided = { ...provides, ...hostProvided };
	const routes = module.handlers.map((handler) => ({
		handler,
		provided,
		steps: [...module.definition.steps, ...handler.steps],
	}));
	return { module, provides, provided, routes };
}
