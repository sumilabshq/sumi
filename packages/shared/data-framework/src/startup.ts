import type { AnyHandler, Inject } from "./handler";
import type { Route } from "./local-routes";
import { stepNameOf } from "./middleware";
import type { ModuleDefinition, Provided, ReadyModule } from "./module";
import type { Platform } from "./platform-module";
import type { ModuleReach } from "./remote-modules";
import type { AnyEvent } from "./event";
import { moduleRoutesOf } from "./routes-of-module";
import { throwIfRefused } from "./throw-if-refused";
import type { ModuleRoutes } from "./routes-of-module";

interface Starting {
	readonly platform: Platform | null;
	readonly modules: readonly ReadyModule[];
	readonly runtimeProvided: Provided;
	readonly remote: ModuleReach | null;
}

const STARTER = "runtime()";
const ON_DEVICE = 'module "{module}" runs on the client; a server runs only modules that run on the server';
const WRONG_MODULE = '{request} is handled in module "{module}", but its name names module "{named}"';
const BUILT_FOR = 'the handler of {request} was built for module "{built}", but module "{module}" holds it';
const TWO_HANDLERS = "{request} has {count} handlers";
const NOT_PROVIDED = "the handler of {request} injects {key}, which its module does not provide as a {token}";
const RUNTIME_KEY = 'module "{module}" provides {key}, which {starter}.provide() already gives every module: rename one';
const RESERVED_KEY = 'module "{module}" provides {key}, a name the framework gives every handler: rename it';
const RUNTIME_RESERVED_KEY = "{starter}.provide() returns {key}, a name the framework gives every handler: rename it";
const RESERVED_KEYS: ReadonlySet<string> = new Set(["send", "emit", "invalidate", "user", "signal", "idempotencyKey"]);
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
	throwIfRefused(STARTER, [...platformFindings(starting), ...ranAndImportedFindings(starting), ...importedTwiceFindings(starting)]);
	const moduleRoutes = starting.modules.map((module) => moduleRoutesOf(module, starting.runtimeProvided));
	const routes = moduleRoutes.flatMap((ofModule) => ofModule.routes);
	throwIfRefused(STARTER, [
		...moduleRoutes.flatMap(reservedKeyFindings),
		...runtimeReservedKeyFindings(starting),
		...moduleRoutes.flatMap((ofModule) => runtimeKeyFindings(ofModule, starting)),
		...moduleRoutes.flatMap(({ module, routes: ofModule }) => ofModule.flatMap((route) => routeFindings(module, route))),
		...duplicateFindings(routes.map((route) => route.handler)),
		...importFindings(starting),
		...moduleRoutes.flatMap(({ module }) => listenFindings(module, starting)),
	]);
	return {
		routes: new Map(routes.map((route) => [route.handler.request.name, route])),
		modules: moduleRoutes,
	};
}

function platformFindings({ platform, modules }: Starting): string[] {
	if (platform !== "server") return [];
	return modules
		.filter(({ definition }) => definition.runs === "client")
		.map(({ definition }) => ON_DEVICE.replace("{module}", definition.name));
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

function runtimeReservedKeyFindings({ runtimeProvided }: Starting): string[] {
	return Object.keys(runtimeProvided)
		.filter((key) => RESERVED_KEYS.has(key))
		.map((key) => RUNTIME_RESERVED_KEY.replace("{starter}", STARTER).replace("{key}", key));
}

function reservedKeyFindings({ module, provides }: ModuleRoutes): string[] {
	return Object.keys(provides)
		.filter((key) => RESERVED_KEYS.has(key))
		.map((key) => RESERVED_KEY.replace("{module}", module.definition.name).replace("{key}", key));
}

function runtimeKeyFindings({ module, provides }: ModuleRoutes, { runtimeProvided }: Starting): string[] {
	return Object.keys(provides)
		.filter((key) => key in runtimeProvided)
		.map((key) =>
			RUNTIME_KEY.replace("{module}", module.definition.name).replace("{key}", key).replace("{starter}", STARTER),
		);
}

function routeFindings(module: ReadyModule, route: Route): string[] {
	const { request } = route.handler;
	const { definition } = module;
	const named =
		request.module === definition.name ? [] : [wrongModule(request.name, definition.name, request.module ?? "none")];
	const built = route.handler.module === definition ? [] : [builtFor(route.handler, definition.name)];
	const injected = missingOf(route.handler.inject, route.provided).map(([key, token]) =>
		fill(NOT_PROVIDED, request.name).replace("{key}", key).replace("{token}", token),
	);
	return [...named, ...built, ...injected, ...unprovidedStepFindings(route)];
}

function unprovidedStepFindings({ handler: { request }, steps, provided }: Route): string[] {
	return steps.flatMap((step) =>
		missingOf(step.requires, provided).map(([key, token]) =>
			fill(STEP_NOT_PROVIDED, request.name)
				.replace("{step}", stepNameOf(steps, step))
				.replace("{key}", key)
				.replace("{starter}", STARTER)
				.replace("{token}", token),
		),
	);
}

function missingOf(inject: Inject, provided: Provided): [string, string][] {
	return Object.entries(inject)
		.filter(([key, token]) => !(provided[key] instanceof token))
		.map(([key, token]) => [key, token.name]);
}

function importFindings({ modules, remote }: Starting): string[] {
	const ranModuleNames = new Set(modules.map(({ definition }) => definition.name));
	return modules.flatMap(({ definition }) =>
		definition.importedModuleNames
			.filter((imported) => !ranModuleNames.has(imported) && remote?.reachesModule(imported) !== true)
			.map((imported) =>
				IMPORT_UNMET.replace("{module}", definition.name)
					.replace("{imported}", imported)
					.replace("{starter}", STARTER),
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
