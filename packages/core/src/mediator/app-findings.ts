import type { Module } from "./module";
import { nameOfToken } from "./token";

const WRONG_MODULE = '{request} is handled by {handler} in module "{module}", but its name names module "{named}"';
const TWO_HANDLERS = "{request} has {count} handlers: {handlers}";
const NO_HANDLER = "{request} has no handler";
const TWO_PROVIDERS = "{token} is provided by {count} modules: {modules}";

export function appFindings(modules: readonly Module[]): string[] {
	return [...handlerFindings(modules), ...missingHandlers(modules), ...providerFindings(modules)];
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

function missingHandlers(modules: readonly Module[]): string[] {
	const handled = new Set(modules.flatMap((module) => module.handlers.map(({ request }) => request.name)));
	const declared = modules.flatMap((module) => module.requests.map(({ name }) => name));
	return [...new Set(declared)]
		.filter((name) => !handled.has(name))
		.map((name) => NO_HANDLER.replace("{request}", name));
}

function providerFindings(modules: readonly Module[]): string[] {
	const providers = new Map<symbol, string[]>();
	for (const module of modules) {
		for (const { token: provided } of module.provide)
			providers.set(provided, [...(providers.get(provided) ?? []), module.name]);
	}
	return [...providers]
		.filter(([, named]) => named.length > 1)
		.map(([provided, named]) =>
			TWO_PROVIDERS.replace("{token}", nameOfToken(provided))
				.replace("{count}", String(named.length))
				.replace("{modules}", named.join(", ")),
		);
}
