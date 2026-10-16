import { isServerOnly } from "./module";
import type { Module } from "./module";
import type { Token } from "./token";

const WRONG_MODULE = '{request} is handled by {handler} in module "{module}", but its name names module "{named}"';
const TWO_HANDLERS = "{request} has {count} handlers: {handlers}";
const TWO_PROVIDERS = "{token} is provided by {count} modules: {modules}";
const NOT_ON_PLATFORM = '{token} (module "{module}") has no implementation on {platform}, which this app ships to';
const EXPORTS_UNPROVIDED = 'module "{module}" exports {token}, which it does not provide';
const IMPORTS_UNLISTED = 'module "{module}" imports module "{imported}", which this app does not list';

export function appFindings(modules: readonly Module[], platforms: readonly string[]): string[] {
	return [
		...handlerFindings(modules),
		...providerFindings(modules),
		...platformFindings(modules, platforms),
		...wiringFindings(modules),
	];
}

function handlerFindings(modules: readonly Module[]): string[] {
	const handled = new Map<string, string[]>();
	const findings: string[] = [];
	for (const module of modules) {
		for (const handler of module.handlers) {
			const { request } = handler;
			handled.set(request.name, [...(handled.get(request.name) ?? []), `${handler.name} (${module.name})`]);
			if (request.module === module.name) continue;
			findings.push(
				WRONG_MODULE.replace("{request}", request.name)
					.replace("{handler}", handler.name)
					.replace("{module}", module.name)
					.replace("{named}", request.module),
			);
		}
	}
	for (const [request, handlers] of handled) {
		if (handlers.length < 2) continue;
		findings.push(
			TWO_HANDLERS.replace("{request}", request)
				.replace("{count}", String(handlers.length))
				.replace("{handlers}", handlers.join(", ")),
		);
	}
	return findings;
}

function providerFindings(modules: readonly Module[]): string[] {
	const providers = new Map<Token<unknown>, string[]>();
	for (const module of modules) {
		for (const { token: provided } of module.provide)
			providers.set(provided, [...(providers.get(provided) ?? []), module.name]);
	}
	return [...providers]
		.filter(([, named]) => named.length > 1)
		.map(([provided, named]) =>
			TWO_PROVIDERS.replace("{token}", provided.name)
				.replace("{count}", String(named.length))
				.replace("{modules}", named.join(", ")),
		);
}

function platformFindings(modules: readonly Module[], platforms: readonly string[]): string[] {
	return modules.flatMap((module) => platforms.flatMap((platform) => uncoveredFindings(module, platform)));
}

function uncoveredFindings(module: Module, platform: string): string[] {
	if (module.covers.some((covered) => covered === platform)) return [];
	return uncoveringTokensOf(module, platform).map((token) => notOnPlatform(token, module, platform));
}

function uncoveringTokensOf(module: Module, platform: string): Token<unknown>[] {
	return module.provide
		.filter((pair) => !isServerOnly(pair) && !pair.platforms.some((covered) => covered === platform))
		.map((pair) => pair.token);
}

function notOnPlatform(token: Token<unknown>, module: Module, platform: string): string {
	return NOT_ON_PLATFORM.replace("{token}", token.name)
		.replace("{module}", module.name)
		.replace("{platform}", platform);
}

function wiringFindings(modules: readonly Module[]): string[] {
	return modules.flatMap((module) => [
		...module.exports
			.filter((token) => !module.provide.some((pair) => pair.token === token))
			.map((token) => EXPORTS_UNPROVIDED.replace("{module}", module.name).replace("{token}", token.name)),
		...module.imports
			.filter((imported) => !modules.includes(imported))
			.map((imported) => IMPORTS_UNLISTED.replace("{module}", module.name).replace("{imported}", imported.name)),
	]);
}
