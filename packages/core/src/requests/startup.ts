import { isPublicGuard } from "./guard";
import type { AnyGuard, Guard } from "./guard";
import type { AnyHandler, Inject } from "./handler";
import type { Route } from "./mediator";
import type { Provided, ReadyModule, Runs } from "./module";

interface Starting {
	readonly side: Runs;
	readonly modules: readonly ReadyModule[];
	readonly hasAuthenticate: boolean;
}

interface Routed {
	readonly module: ReadyModule;
	readonly route: Route;
}

const REFUSED = "{starter} refused:\n{findings}";
const STARTERS = { client: "app()", server: "server()" } as const;
const WRONG_SIDE = {
	client: 'module "{module}" runs on the server; a client app reaches it through its server',
	server: 'module "{module}" runs on the client; a server runs only modules that run on the server',
} as const;
const WRONG_MODULE = '{request} is handled in module "{module}", but its name names module "{named}"';
const TWO_HANDLERS = "{request} has {count} handlers";
const NOT_PROVIDED = "the handler of {request} injects {key}, which its module does not provide as a {token}";
const NEEDS_AUTHENTICATE = "{request} is guarded by {guard}, which needs an Authenticate in the starter's host";
const UNGUARDED = "{request} runs on the server with no guard: give it PublicGuard or a guard";
const GUARD_AT = "guard #{at}";
const GUARD_NOT_PROVIDED = "{guard} of {request} injects {key}, which its module does not provide as a {token}";

export function routesOf(starting: Starting): ReadonlyMap<string, Route> {
	refuseOn(starting.side, sideFindings(starting));
	const routed = starting.modules.flatMap((module) => routedOf(module, starting.side));
	refuseOn(starting.side, [
		...routed.flatMap(({ module, route }) => routeFindings(module, route, starting)),
		...duplicateFindings(routed.map(({ route }) => route.handler)),
	]);
	return new Map(routed.map(({ route }) => [route.handler.request.name, route]));
}

function routedOf(module: ReadyModule, side: Runs): Routed[] {
	const provided = module.provide();
	return module.handlers.map((handler) => ({
		module,
		route: { handler, provided, guards: side === "server" ? guardsRunBy(handler.request.guards) : [] },
	}));
}

function guardsRunBy(declared: readonly AnyGuard[]): Guard[] {
	return declared.flatMap((given) => (isPublicGuard(given) ? [] : [given]));
}

function refuseOn(side: Runs, findings: readonly string[]): void {
	if (findings.length === 0) return;
	throw new Error(REFUSED.replace("{starter}", STARTERS[side]).replace("{findings}", findings.join("\n")));
}

function sideFindings({ side, modules }: Starting): string[] {
	return modules
		.filter((module) => module.runs !== side)
		.map((module) => WRONG_SIDE[side].replace("{module}", module.name));
}

function routeFindings(module: ReadyModule, route: Route, starting: Starting): string[] {
	const { request } = route.handler;
	const named = request.module === module.name ? [] : [wrongModule(request.name, module.name, request.module)];
	const injected = missingOf(route.handler.inject, route.provided).map(([key, token]) =>
		fill(NOT_PROVIDED, request.name).replace("{key}", key).replace("{token}", token),
	);
	const guarded = starting.side === "server" ? serverGuardFindings(route, starting) : [];
	return [...named, ...injected, ...guarded];
}

function serverGuardFindings(route: Route, { hasAuthenticate }: Starting): string[] {
	const { request } = route.handler;
	if (request.guards.length === 0) return [fill(UNGUARDED, request.name)];
	const needing = hasAuthenticate ? [] : route.guards.filter((given) => given.needsUser);
	const authenticate = needing
		.slice(0, 1)
		.map((given) => fill(NEEDS_AUTHENTICATE, request.name).replace("{guard}", guardNameOf(request.guards, given)));
	return [...unprovidedGuardFindings(route), ...authenticate];
}

function unprovidedGuardFindings({ handler: { request }, guards, provided }: Route): string[] {
	return guards.flatMap((given) =>
		missingOf(given.inject, provided).map(([key, token]) =>
			fill(GUARD_NOT_PROVIDED, request.name)
				.replace("{guard}", guardNameOf(request.guards, given))
				.replace("{key}", key)
				.replace("{token}", token),
		),
	);
}

function guardNameOf(declared: readonly AnyGuard[], given: Guard): string {
	return given.label ?? GUARD_AT.replace("{at}", String(declared.indexOf(given) + 1));
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

function fill(message: string, request: string): string {
	return message.replace("{request}", request);
}
