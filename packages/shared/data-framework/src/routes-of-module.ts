import { wireNameOf } from "./identity";
import type { Route } from "./local-routes";
import type { Provided, ReadyModule } from "./module";

export interface ModuleRoutes {
	readonly module: ReadyModule;
	readonly provides: Provided;
	readonly provided: Provided;
	readonly routes: readonly Route[];
}

export function moduleRoutesOf(module: ReadyModule, runtimeProvided: Provided): ModuleRoutes {
	const provides = module.provide();
	const provided = { ...provides, ...runtimeProvided };
	const prefix = module.prefix ?? null;
	const routes = module.handlers.map((handler) => ({
		name: wireNameOf(prefix, handler.request.name),
		prefix,
		handler,
		provided,
		steps: [...module.definition.steps, ...handler.steps],
	}));
	return { module, provides, provided, routes };
}
