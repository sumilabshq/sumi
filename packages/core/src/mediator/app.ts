import { appFindings } from "./app-findings";
import { Container } from "./container";
import { DoneKeys, MemoryDoneKeys } from "./done-keys";
import { Mediator } from "./mediator";
import type { Route } from "./mediator";
import type { Module } from "./module";
import { builtFor } from "./platform";
import type { AnyHost, AppPlatform } from "./platform";
import { ReportFailure, reportToConsole } from "./report-failure";
import type { FailureReport } from "./report-failure";
import type { App } from "./sends";
import { NoServerTransport, ServerTransport } from "./server-transport";

export type CoveredByAll<M> = M extends readonly [infer First, ...infer Rest]
	? First extends Module<infer Covers>
		? Covers & CoveredByAll<Rest>
		: never
	: AppPlatform;

export interface AppDeclaration<M extends readonly Module[] = readonly Module[]> {
	readonly modules: M;
	readonly platforms: readonly CoveredByAll<M>[];
	readonly host: AnyHost;
}

const REFUSED = "app() refused:\n{findings}";
const OTHER_BUILD = "this build runs on {built}, but the host given to app() is {host}";
const NOT_SHIPPED = "the host is {host}, a platform this app does not name in platforms: {platforms}";

export function app<const M extends readonly Module[]>(declared: AppDeclaration<M>): App {
	const { modules, platforms, host } = declared;
	const findings = [...hostFindings(host, platforms), ...appFindings(modules, platforms)];
	if (findings.length > 0) throw new Error(REFUSED.replace("{findings}", findings.join("\n")));
	const container = new Container(modules, host, {
		send: (request, input, options) => mediator.send(request, input, options),
	});
	const mediator = new Mediator({
		host,
		doneKeys: container.has(DoneKeys) ? container.resolveForApp(DoneKeys) : new MemoryDoneKeys(),
		reportFailure: reporterOf(container),
		transport: container.has(ServerTransport) ? container.resolveForApp(ServerTransport) : new NoServerTransport(),
	});
	mediator.route(routesOf(modules, container, host));
	return mediator;
}

function routesOf(modules: readonly Module[], container: Container, host: AnyHost): Map<string, Route> {
	const runsHere = (module: Module) =>
		module.handlers.filter((handler) => handler.request.side === "client" || host.platform === "server");
	return new Map(
		modules.flatMap((module) =>
			runsHere(module).map((handler): [string, Route] => [
				handler.request.name,
				{ handler: container.build({ who: handler.name, module }, () => new handler()), use: module.use },
			]),
		),
	);
}

function hostFindings(host: AnyHost, platforms: readonly string[]): string[] {
	const built = builtFor();
	if (built !== host.platform) return [OTHER_BUILD.replace("{built}", built).replace("{host}", host.platform)];
	if (host.platform === "server" || platforms.includes(host.platform)) return [];
	return [NOT_SHIPPED.replace("{host}", host.platform).replace("{platforms}", platforms.join(", "))];
}

function reporterOf(container: Container): FailureReport {
	if (!container.has(ReportFailure)) return reportToConsole;
	const reporter = container.resolveForApp(ReportFailure);
	return (failure) => reporter.report(failure);
}
