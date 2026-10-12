import { appFindings } from "./app-findings";
import { Container } from "./container";
import { DoneKeys, MemoryDoneKeys } from "./done-keys";
import type { AppHost } from "./handles";
import { Mediator } from "./mediator";
import type { Route } from "./mediator";
import type { Module } from "./module";
import { ReportFailure, reportToConsole } from "./report-failure";
import type { Provided } from "./token";
import type { App } from "./sends";

export interface AppDeclaration {
	readonly modules: readonly Module[];
	readonly host: AppHost;
}

const REFUSED = "app() refused:\n{findings}";

export function app({ modules, host }: AppDeclaration): App {
	const findings = appFindings(modules);
	if (findings.length > 0) throw new Error(REFUSED.replace("{findings}", findings.join("\n")));
	const container = new Container(providedOf(modules), host);
	const routes = new Map<string, Route>(
		modules.flatMap((module) =>
			module.handlers.map((handler): [string, Route] => [
				handler.request.name,
				{ handler: container.build(() => new handler()), use: module.use },
			]),
		),
	);
	return new Mediator(routes, {
		host,
		doneKeys: container.has(DoneKeys) ? container.resolve(DoneKeys) : new MemoryDoneKeys(),
		reportFailure: container.has(ReportFailure) ? container.resolve(ReportFailure) : reportToConsole,
	});
}

function providedOf(modules: readonly Module[]): Map<symbol, Provided> {
	return new Map(modules.flatMap((module) => module.provide.map((pair): [symbol, Provided] => [pair.token, pair])));
}
