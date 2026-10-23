import { isCovering } from "./guard";
import type { AnyHandler, Inject } from "./handler";
import type { Route } from "./local-routes";
import { isGuardStep } from "./middleware";
import type { Step } from "./middleware";
import type { Provided, ReadyModule, Side } from "./module";
import { moduleRoutesOf } from "./routes-of-module";
import type { ModuleRoutes } from "./routes-of-module";

interface Starting {
	readonly side: Side;
	readonly modules: readonly ReadyModule[];
	readonly hasAuthenticate: boolean;
	readonly hostProvided: Provided;
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
const HOST_KEY = 'module "{module}" provides {key}, which the host provides';
const NEEDS_AUTHENTICATE = "{request} is guarded by {guard}, which needs an Authenticate in the starter's host";
const NEEDS_USER_ON_CLIENT =
	"{request} is guarded by {guard}, which needs a user, and app() has no Authenticate: guard it where its server handles it";
const UNGUARDED =
	"{request} runs on the server with no guard deciding who calls it: guard its module or handler with AuthenticatedGuard, HasPermissionGuard or a guard that needs a user, PublicGuard when anyone may call it";
const GUARD_AT = "guard #{at}";
const MIDDLEWARE_AT = "middleware #{at}";
const STEP_NOT_PROVIDED = "{step} of {request} injects {key}, which its module does not provide as a {token}";

export function routesOf(starting: Starting): ReadonlyMap<string, Route> {
	refuseOn(starting.side, sideFindings(starting));
	const held = starting.modules.map((module) => moduleRoutesOf(module, starting.side, starting.hostProvided));
	const routes = held.flatMap(({ routes: routed }) => routed);
	refuseOn(starting.side, [
		...held.flatMap((one) => hostKeyFindings(one, starting.hostProvided)),
		...held.flatMap(({ module, routes: routed }) => routed.flatMap((route) => routeFindings(module, route, starting))),
		...duplicateFindings(routes.map((route) => route.handler)),
	]);
	return new Map(routes.map((route) => [route.handler.request.name, route]));
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

function hostKeyFindings({ module, provides }: ModuleRoutes, hostProvided: Provided): string[] {
	return Object.keys(provides)
		.filter((key) => key in hostProvided)
		.map((key) => HOST_KEY.replace("{module}", module.definition.name).replace("{key}", key));
}

function routeFindings(module: ReadyModule, route: Route, starting: Starting): string[] {
	const { request } = route.handler;
	const { definition } = module;
	const named = request.module === definition.name ? [] : [wrongModule(request.name, definition.name, request.module)];
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
	return [...unprovidedStepFindings(route, declared), ...authenticate];
}

function unprovidedStepFindings({ handler: { request }, steps, provided }: Route, declared: readonly Step[]): string[] {
	return steps.flatMap((step) =>
		missingOf(step.inject, provided).map(([key, token]) =>
			fill(STEP_NOT_PROVIDED, request.name)
				.replace("{step}", stepNameOf(declared, step))
				.replace("{key}", key)
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
