import type { Route } from "./local-routes";
import { rateLimit } from "./middleware";
import type { Step } from "./middleware";
import type { Provided, ReadyModule, Side } from "./module";
import { SERVER_RATE_LIMIT } from "./rate-limits";

export interface ModuleRoutes {
	readonly module: ReadyModule;
	readonly provides: Provided;
	readonly routes: readonly Route[];
}

const SERVER_DEFAULT_LIMIT = rateLimit(SERVER_RATE_LIMIT);

export function moduleRoutesOf(module: ReadyModule, side: Side, hostProvided: Provided): ModuleRoutes {
	const provides = module.provide();
	const provided = { ...provides, ...hostProvided };
	const routes = module.handlers.map((handler) => {
		const declared = [...module.definition.steps, ...handler.steps];
		return {
			handler,
			provided,
			steps: side === "server" ? serverStepsOf(declared) : declared,
		};
	});
	return { module, provides, routes };
}

// TODO: key the default limit by client address through Authenticate: every anonymous caller shares one bucket.
export function serverStepsOf(declared: readonly Step[]): readonly Step[] {
	return declared.some((step) => step.kind === "rate-limit") ? declared : [SERVER_DEFAULT_LIMIT, ...declared];
}
