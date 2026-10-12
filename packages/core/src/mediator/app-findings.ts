import type { Module } from "./module";
import type { Token } from "./token";

const WRONG_MODULE = '{request} is handled by {handler} in module "{module}", but its name names module "{named}"';
const TWO_HANDLERS = "{request} has {count} handlers: {handlers}";
const TWO_PROVIDERS = "{token} is provided by {count} modules: {modules}";

export function appFindings(modules: readonly Module[]): string[] {
	return [...handlerFindings(modules), ...providerFindings(modules)];
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
