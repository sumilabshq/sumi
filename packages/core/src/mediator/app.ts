import { appFindings } from "./app-findings";
import { Container } from "./container";
import { DoneKeys, MemoryDoneKeys } from "./done-keys";
import type { AppHost } from "./handles";
import { Mediator } from "./mediator";
import type { Route } from "./mediator";
import type { Module } from "./module";
import type { Provider } from "./token";
import type { App } from "./sends";

export interface AppDeclaration {
	readonly modules: readonly Module[];
	readonly host: AppHost;
}

const REFUSED = "app() refused:\n{findings}";

export function app({ modules, host }: AppDeclaration): App {
	const findings = appFindings(modules);
	if (findings.length > 0) throw new Error(REFUSED.replace("{findings}", findings.join("\n")));
	const container = new Container(providersOf(modules), host);
	const routes = new Map<string, Route>(
		modules.flatMap((module) =>
			module.handlers.map((handler): [string, Route] => [
				handler.request.name,
				{ handler: container.build(() => new handler()), use: module.use },
			]),
		),
	);
	const doneKeys = container.has(DoneKeys) ? container.resolve(DoneKeys) : new MemoryDoneKeys();
	return new Mediator(routes, host, doneKeys);
}

function providersOf(modules: readonly Module[]): Map<symbol, Provider> {
	return new Map(
		modules.flatMap((module) =>
			Object.getOwnPropertySymbols(module.provide).flatMap((provided): [symbol, Provider][] => {
				const provider = module.provide[provided];
				return provider === undefined ? [] : [[provided, provider]];
			}),
		),
	);
}
