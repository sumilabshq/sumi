import { isCovering } from "./guard";
import type { AnyHandler, Inject } from "./handler";
import type { Route } from "./local-routes";
import { isGuardStep } from "./middleware";
import type { Step } from "./middleware";
import type { ModuleDefinition, Provided, ReadyModule, Side } from "./module";
import type { ModuleReach } from "./remote-modules";
import type { AnyEvent } from "./event";
import { moduleRoutesOf } from "./routes-of-module";
import type { ModuleRoutes } from "./routes-of-module";

interface Starting {
	readonly side: Side;
	readonly modules: readonly ReadyModule[];
	readonly hasAuthenticate: boolean;
	readonly runtimeProvided: Provided;
	readonly remote: ModuleReach | null;
}

const REFUSED = "{starter} refused:\n{findings}";
const STARTERS = { client: "app()", server: "server()" } as const;
const WRONG_SIDE = {
	client: 'module "{module}" runs on the server; a client app reaches it through its server',
	server: 'module "{module}" runs on the client; a server runs only modules that run on the server',
} as const;
const WRONG_MODULE = '{request} is handled in module "{module}", but its name names module "{named}"';
const BUILT_FOR = 'the handler of {request} was built for module "{built}", but module "{module}" holds it';
const TWO_HANDLERS = "{request} has {count} handlers";
const NOT_PROVIDED = "the handler of {request} injects {key}, which its module does not provide as a {token}";
const RUNTIME_KEY = 'module "{module}" provides {key}, which {starter}.provide() already gives every module: rename one';
const RESERVED_KEY = 'module "{module}" provides {key}, a name the framework gives every handler: rename it';
const RUNTIME_RESERVED_KEY = "{starter}.provide() returns {key}, a name the framework gives every handler: rename it";
const RESERVED_KEYS: ReadonlySet<string> = new Set(["send", "emit", "invalidate", "user", "signal", "idempotencyKey"]);
const NEEDS_AUTHENTICATE = "{request} is guarded by {guard}, which needs an Authenticate in the starter's host";
const NEEDS_USER_ON_CLIENT =
	"{request} is guarded by {guard}, which needs a user, and app() has no Authenticate: guard it where its server handles it";
const UNGUARDED =
	"{request} runs on the server with no guard deciding who calls it: guard its module or handler with AuthenticatedGuard, HasPermissionGuard or a guard that needs a user, PublicGuard when anyone may call it";
const GUARD_AT = "guard #{at}";
const MIDDLEWARE_AT = "middleware #{at}";
const STEP_NOT_PROVIDED =
	"{step} of {request} requires {key}, which neither its module nor {starter}.provide() gives as a {token}";
const IMPORT_UNMET =
	'module "{module}" imports {imported}, which {starter} neither runs nor reaches: add it to .modules() or .imports()';
const EVENT_NOT_IMPORTED =
	'{owner} listens to {event}, but module "{module}" does not import {eventModule}: add .imports()';
const EVENT_OVER_NETWORK =
	"{owner} listens to {event}, and {eventModule} is imported from an address: events do not cross the network yet; run {eventModule} in .modules()";
const RAN_AND_IMPORTED =
	'module "{module}" is both run in .modules() and imported from an address in .imports(): keep exactly one';
const IMPORTED_TWICE = 'module "{module}" is imported {count} times in .imports(): import it once';

export interface StartedRoutes {
	readonly routes: ReadonlyMap<string, Route>;
	readonly modules: readonly ModuleRoutes[];
}

export function routesOf(starting: Starting): StartedRoutes {
	refuseOn(starting.side, [
		...sideFindings(starting),
		...ranAndImportedFindings(starting),
		...importedTwiceFindings(starting),
	]);
	const moduleRoutes = starting.modules.map((module) => moduleRoutesOf(module, starting.runtimeProvided));
	const routes = moduleRoutes.flatMap((ofModule) => ofModule.routes);
	refuseOn(starting.side, [
		...moduleRoutes.flatMap(reservedKeyFindings),
		...runtimeReservedKeyFindings(starting),
		...moduleRoutes.flatMap((ofModule) => runtimeKeyFindings(ofModule, starting)),
		...moduleRoutes.flatMap(({ module, routes: ofModule }) =>
			ofModule.flatMap((route) => routeFindings(module, route, starting)),
		),
		...duplicateFindings(routes.map((route) => route.handler)),
		...importFindings(starting),
		...moduleRoutes.flatMap(({ module }) => listenFindings(module, starting)),
	]);
	return {
		routes: new Map(routes.map((route) => [route.handler.request.name, route])),
		modules: moduleRoutes,
	};
}

function refuseOn(side: Side, findings: readonly string[]): void {
	if (findings.length === 0) return;
	throw new Error(REFUSED.replace("{starter}", STARTERS[side]).replace("{findings}", findings.join("\n")));
}

function sideFindings({ side, modules }: Starting): string[] {
	return modules
		.filter(({ definition }) => definition.runs !== side && definition.runs !== "anywhere")
		.map(({ definition }) => WRONG_SIDE[side].replace("{module}", definition.name));
}

function ranAndImportedFindings({ modules, remote }: Starting): string[] {
	const ranModuleNames = new Set(modules.map(({ definition }) => definition.name));
	return [...new Set(remote?.importedModuleNames)]
		.filter((imported) => ranModuleNames.has(imported))
		.map((imported) => RAN_AND_IMPORTED.replace("{module}", imported));
}

function importedTwiceFindings({ remote }: Starting): string[] {
	const counts = new Map<string, number>();

	for (const imported of remote?.importedModuleNames ?? []) {
		counts.set(imported, (counts.get(imported) ?? 0) + 1);
	}

	return [...counts]
		.filter(([, count]) => count > 1)
		.map(([imported, count]) => IMPORTED_TWICE.replace("{module}", imported).replace("{count}", String(count)));
}

function runtimeReservedKeyFindings({ side, runtimeProvided }: Starting): string[] {
	return Object.keys(runtimeProvided)
		.filter((key) => RESERVED_KEYS.has(key))
		.map((key) => RUNTIME_RESERVED_KEY.replace("{starter}", STARTERS[side]).replace("{key}", key));
}

function reservedKeyFindings({ module, provides }: ModuleRoutes): string[] {
	return Object.keys(provides)
		.filter((key) => RESERVED_KEYS.has(key))
		.map((key) => RESERVED_KEY.replace("{module}", module.definition.name).replace("{key}", key));
}

function runtimeKeyFindings({ module, provides }: ModuleRoutes, { side, runtimeProvided }: Starting): string[] {
	return Object.keys(provides)
		.filter((key) => key in runtimeProvided)
		.map((key) =>
			RUNTIME_KEY.replace("{module}", module.definition.name)
				.replace("{key}", key)
				.replace("{starter}", STARTERS[side]),
		);
}

function routeFindings(module: ReadyModule, route: Route, starting: Starting): string[] {
	const { request } = route.handler;
	const { definition } = module;
	const named =
		request.module === definition.name ? [] : [wrongModule(request.name, definition.name, request.module ?? "none")];
	const built = route.handler.module === definition ? [] : [builtFor(route.handler, definition.name)];
	const injected = missingOf(route.handler.inject, route.provided).map(([key, token]) =>
		fill(NOT_PROVIDED, request.name).replace("{key}", key).replace("{token}", token),
	);
	return [...named, ...built, ...injected, ...stepFindings(module, route, starting)];
}

function stepFindings(module: ReadyModule, route: Route, { side, hasAuthenticate }: Starting): string[] {
	const declared = [...module.definition.steps, ...route.handler.steps];

	if (side === "server" && !declared.some(isCovering)) {
		return [fill(UNGUARDED, route.handler.request.name)];
	}

	const needing = hasAuthenticate ? undefined : route.steps.find((step) => step.needsUser);
	const template = side === "server" ? NEEDS_AUTHENTICATE : NEEDS_USER_ON_CLIENT;
	const authenticate =
		needing === undefined
			? []
			: [fill(template, route.handler.request.name).replace("{guard}", stepNameOf(declared, needing))];
	return [...unprovidedStepFindings(route, declared, side), ...authenticate];
}

function unprovidedStepFindings(
	{ handler: { request }, steps, provided }: Route,
	declared: readonly Step[],
	side: Side,
): string[] {
	return steps.flatMap((step) =>
		missingOf(step.requires, provided).map(([key, token]) =>
			fill(STEP_NOT_PROVIDED, request.name)
				.replace("{step}", stepNameOf(declared, step))
				.replace("{key}", key)
				.replace("{starter}", STARTERS[side])
				.replace("{token}", token),
		),
	);
}

function stepNameOf(declared: readonly Step[], step: Step): string {
	const at = String(declared.indexOf(step) + 1);
	return step.label ?? (isGuardStep(step) ? GUARD_AT : MIDDLEWARE_AT).replace("{at}", at);
}

function missingOf(inject: Inject, provided: Provided): [string, string][] {
	return Object.entries(inject)
		.filter(([key, token]) => !(provided[key] instanceof token))
		.map(([key, token]) => [key, token.name]);
}

function importFindings({ side, modules, remote }: Starting): string[] {
	const ranModuleNames = new Set(modules.map(({ definition }) => definition.name));
	return modules.flatMap(({ definition }) =>
		definition.importedModuleNames
			.filter((imported) => !ranModuleNames.has(imported) && remote?.reachesModule(imported) !== true)
			.map((imported) =>
				IMPORT_UNMET.replace("{module}", definition.name)
					.replace("{imported}", imported)
					.replace("{starter}", STARTERS[side]),
			),
	);
}

function listenFindings({ definition }: ReadyModule, starting: Starting): string[] {
	const listened = [
		...definition.listedSubscribers.map((listed) => ({
			owner: `the subscriber of ${listed.event.name}`,
			event: listed.event,
		})),
	];
	return listened.flatMap(({ owner, event }) => eventSourceFindings(definition, owner, event, starting));
}

function eventSourceFindings(
	definition: ModuleDefinition,
	owner: string,
	event: AnyEvent,
	{ modules, remote }: Starting,
): string[] {
	const eventModule = event.module ?? definition.name;

	if (eventModule === definition.name) {
		return [];
	}

	const said = (template: string): string =>
		template
			.replace("{owner}", owner)
			.replace("{event}", event.name)
			.replace("{module}", definition.name)
			.replace(/\{eventModule\}/g, eventModule);

	if (!definition.importedModuleNames.includes(eventModule)) {
		return [said(EVENT_NOT_IMPORTED)];
	}

	const isRanHere = modules.some((started) => started.definition.name === eventModule);
	return !isRanHere && remote?.reachesModule(eventModule) === true ? [said(EVENT_OVER_NETWORK)] : [];
}

function duplicateFindings(handlers: readonly AnyHandler[]): string[] {
	const counts = new Map<string, number>();
	for (const { request } of handlers) counts.set(request.name, (counts.get(request.name) ?? 0) + 1);
	return [...counts]
		.filter(([, count]) => count > 1)
		.map(([request, count]) => fill(TWO_HANDLERS, request).replace("{count}", String(count)));
}

function wrongModule(request: string, module: string, named: string): string {
	return fill(WRONG_MODULE, request).replace("{module}", module).replace("{named}", named);
}

function builtFor(handler: AnyHandler, module: string): string {
	return fill(BUILT_FOR, handler.request.name).replace("{built}", handler.module.name).replace("{module}", module);
}

function fill(message: string, request: string): string {
	return message.replace("{request}", request);
}
