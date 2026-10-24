import { QueryClient } from "@tanstack/react-query";
import { refusalOf } from "./answer";
import type { Answer, Refusal } from "./answer";
import { MemoryDoneKeys } from "./done-keys";
import type { DoneKeys } from "./done-keys";
import { LocalRoutes } from "./local-routes";
import { Mediator } from "./mediator";
import type { Sending } from "./mediator";
import { readyModuleOf } from "./module";
import type { ServerParts, StartableModule } from "./module";
import type { ModuleFacts, ModuleScope, Platform } from "./platform-module";
import { QueryWatches } from "./query-watches";
import { RemoteServer } from "./remote-server";
import { reportToConsole } from "./report-failure";
import type { FailureReport } from "./report-failure";
import type { AnyRequest, InputArgs, OutputOf } from "./request";
import { RouteQueries } from "./route-queries";
import { routesOf } from "./startup";
import { remoteOver } from "./wire-client";
import type { WireHost } from "./wire-client";

export interface AppHost extends WireHost {
	readonly reportFailure?: FailureReport;
	readonly doneKeys?: DoneKeys;
}

export interface AppStart {
	readonly modules: readonly StartableModule[];
	readonly platform?: Platform;
	readonly scope?: ModuleScope;
	readonly env?: ServerParts["env"];
	readonly server?: string | undefined;
	readonly host?: AppHost;
}

export interface StartedApp {
	readonly queryClient: QueryClient;
	readonly reportFailure: FailureReport;
	readonly routes: RouteQueries;
	readonly watches: QueryWatches;
	send<R extends AnyRequest>(request: R, ...asked: [...InputArgs<R>, sending?: Sending]): Promise<Answer<OutputOf<R>>>;
}

const NO_SERVER = "{name} runs on no module of this app, and no server is configured";

export function app(start: AppStart): StartedApp {
	const { server, host = {} } = start;
	const reportFailure = host.reportFailure ?? reportToConsole;
	const local = clientRoutesOf(start, server !== undefined);
	const remote = server === undefined ? null : new RemoteServer(remoteOver(server, host));
	const mediator = new Mediator({ local, remote, keyMinting: "client-mints", missing: noServer, reportFailure });
	const routes = new RouteQueries({ local, reachesServer: remote !== null, missing: noServer, reportFailure });
	return new ClientApp(mediator, routes, reportFailure);
}

class ClientApp implements StartedApp {
	readonly queryClient = new QueryClient();
	readonly watches: QueryWatches;

	constructor(
		private readonly mediator: Mediator,
		readonly routes: RouteQueries,
		readonly reportFailure: FailureReport,
	) {
		this.watches = new QueryWatches(this.queryClient, routes);
	}

	send<R extends AnyRequest>(request: R, ...asked: [...InputArgs<R>, sending?: Sending]): Promise<Answer<OutputOf<R>>>;
	async send(request: AnyRequest, sent?: unknown, sending?: Sending): Promise<Answer<unknown>> {
		const answer = await this.mediator.send(request, sent, sending);
		void this.reReadAfter(request, answer);
		return answer;
	}

	private async reReadAfter(request: AnyRequest, answer: Answer<unknown>): Promise<void> {
		if (request.kind !== "command" || (!answer.ok && !answer.ran)) return;
		const listed = request.invalidated;
		if (listed === null) return this.queryClient.invalidateQueries();
		await Promise.all(listed.map((query) => this.queryClient.invalidateQueries({ queryKey: [query.name] })));
	}
}

function noServer(request: AnyRequest): Refusal {
	return refusalOf("no-server", NO_SERVER.replace("{name}", request.name));
}

function clientRoutesOf(start: AppStart, reachesServer: boolean): LocalRoutes {
	const facts = factsOf(start);
	const ready = start.modules.map((module) => readyModuleOf(module, undefined, facts));
	return new LocalRoutes({
		routes: routesOf({ side: "client", modules: ready, hasAuthenticate: false, hostProvided: {}, reachesServer }),
		authenticate: null,
		doneKeys: start.host?.doneKeys ?? new MemoryDoneKeys(),
		callers: "one",
	});
}

function factsOf({ platform, scope, env = {} }: AppStart): ModuleFacts | null {
	if (platform === undefined || scope === undefined) {
		return null;
	}

	return { platform, scope, env };
}
