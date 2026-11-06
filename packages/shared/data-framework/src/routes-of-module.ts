import type { Route } from "./local-routes";
import type { Provided, ReadyModule, Side } from "./module";

export interface ModuleRoutes {
	readonly module: ReadyModule;
	readonly provides: Provided;
	readonly provided: Provided;
	readonly routes: readonly Route[];
}

export function moduleRoutesOf(module: ReadyModule, side: Side, hostProvided: Provided): ModuleRoutes {
	const provides = module.provide();
	const provided = { ...provides, ...hostProvided };
	const routes = module.handlers.map((handler) => {
		const isServerOnly = module.definition.serverOnlyRequestNames.includes(handler.request.name);
		return {
			handler,
			provided,
			steps: [...module.definition.steps, ...handler.steps],
			isServerOnly,
			isOwnModuleOnly: isServerOnly && side === "client",
		};
	});
	return { module, provides, provided, routes };
}
