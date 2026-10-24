import { QueryClient } from "@tanstack/react-query";
import { refusalOf } from "./answer";
import type { Answer, Refusal } from "./answer";
import { MemoryDoneKeys } from "./done-keys";
import type { DoneKeys } from "./done-keys";
import { EventBus } from "./event-bus";
import type { NeedsBox, Unboxed } from "./host-needs";
import { Invalidations } from "./invalidation";
import { LocalRoutes } from "./local-routes";
import { Mediator } from "./mediator";
import type { Sending } from "./mediator";
import { RequestsModule, readyModuleOf } from "./module";
import type { HandledModule, NothingProvided, Provided, ReadyModule, ServerParts, StartableModule } from "./module";
import type { RemoteModule } from "./module-contract";
import { listenedEventNames, startModuleEvents } from "./module-events";
import type { DeviceRuns } from "./placement";
import type { ModuleFacts, ModuleScope, Platform, PlatformModule } from "./platform-module";
import { QueryWatches } from "./query-watches";
import { SingleServer, RemoteModules } from "./remote-modules";
import type { ModuleReach } from "./remote-modules";
import { reportToConsole } from "./report-failure";
import type { FailureReport } from "./report-failure";
import type { AnyRequest, InputArgs, OutputOf } from "./request";
import { RouteQueries } from "./route-queries";
import { routesOf } from "./startup";
import type { StartedRoutes } from "./startup";
import type { WireHost } from "./wire-client";

export interface AppHost extends WireHost {
	readonly reportFailure?: FailureReport;
	readonly doneKeys?: DoneKeys;
}

export type HostObjects = Readonly<Record<string, unknown>>;

export interface AppStart {
	readonly modules: readonly StartableModule[];
	readonly platform?: Platform;
	readonly scope?: ModuleScope;
	readonly env?: ServerParts["env"];
	readonly server?: string | undefined;
	readonly host?: AppHost & HostObjects;
}

export interface StartedApp {
	readonly queryClient: QueryClient;
	readonly reportFailure: FailureReport;
	readonly routes: RouteQueries;
	readonly watches: QueryWatches;
	send<R extends AnyRequest>(request: R, ...asked: [...InputArgs<R>, sending?: Sending]): Promise<Answer<OutputOf<R>>>;
	stop(): void;
}

export interface AppStartOptions {
	readonly platform?: Platform;
	readonly scope?: ModuleScope;
	readonly env?: ServerParts["env"];
	readonly host?: AppHost & HostObjects;
}

export type HostNeedsOf<M> =
	M extends PlatformModule<Provided, DeviceRuns, infer N> ? NeedsBox<N> : NeedsBox<NothingProvided>;

type IntersectionOf<U> = (U extends unknown ? (union: U) => void : never) extends (all: infer I) => void ? I : never;

export type LentBy<N extends Provided> = keyof N extends never
	? [options?: AppStartOptions]
	: [options: AppStartOptions & { readonly host: AppHost & N }];

export type DeviceModule = PlatformModule<Provided, DeviceRuns, NothingProvided> | HandledModule<void> | ReadyModule;

const NO_SERVER = "{name} runs on no module of this app, and no server is configured";

export class AppBuilder<N extends Provided = NothingProvided> {
	constructor(
		private readonly ranModules: readonly DeviceModule[],
		private readonly remoteModules: readonly RemoteModule[],
	) {}

	modules<const M extends readonly DeviceModule[]>(
		...modules: M
	): AppBuilder<N & Unboxed<IntersectionOf<HostNeedsOf<M[number]>>>> {
		return new AppBuilder([...this.ranModules, ...modules], this.remoteModules);
	}

	imports(...modules: readonly RemoteModule[]): AppBuilder<N> {
		return new AppBuilder(this.ranModules, [...this.remoteModules, ...modules]);
	}

	start(...[options = {}]: LentBy<N>): StartedApp {
		const host = options.host ?? {};
		const remote = new RemoteModules(this.remoteModules, host, noServer);
		return startApp({ ...options, modules: this.ranModules, host }, remote);
	}
}

export function app(): AppBuilder;
export function app(start: AppStart): StartedApp;
export function app(start?: AppStart): AppBuilder | StartedApp {
	if (start === undefined) {
		return new AppBuilder([], []);
	}

	const { server, host = {} } = start;
	return startApp(start, server === undefined ? null : new SingleServer(server, host));
}

export function hostProvidedOf(host: HostObjects): Provided {
	const lent: Record<string, object> = {};

	for (const [key, held] of Object.entries(host)) {
		if (typeof held === "object" && held !== null) {
			lent[key] = held;
		}
	}

	return lent;
}

function startApp(start: AppStart, remote: ModuleReach | null): StartedApp {
	const reportFailure = start.host?.reportFailure ?? reportToConsole;
	const bus = new EventBus(reportFailure);
	const startedRoutes = clientRoutesOf(start, remote);
	const local = new LocalRoutes({
		routes: startedRoutes.routes,
		authenticate: null,
		doneKeys: start.host?.doneKeys ?? new MemoryDoneKeys(),
		callers: "one",
		bus,
	});
	const mediator = new Mediator({ local, remote, keyMinting: "client-mints", missing: noServer, reportFailure });
	const queryClient = new QueryClient();
	const invalidations = new Invalidations(queryClient);
	const routes = new RouteQueries({ local, remote, missing: noServer, reportFailure, invalidations });
	const isModuleRequest = (request: AnyRequest): boolean =>
		local.routeOf(request)?.handler.module instanceof RequestsModule || remote?.forwards(request) === true;
	const clientApp = new ClientApp({ mediator, routes, reportFailure, queryClient, invalidations, isModuleRequest });
	const modules = startedRoutes.modules.map(({ module, provided }) => ({ definition: module.definition, provided }));
	clientApp.stopsWith(
		startModuleEvents({
			modules,
			listened: listenedEventNames(modules),
			platform: start.platform ?? null,
			bus,
			sender: mediator,
			reportFailure,
			applyInvalidations: (invalidated) => invalidations.apply(invalidated),
		}),
	);
	return clientApp;
}

interface ClientAppParts {
	readonly mediator: Mediator;
	readonly routes: RouteQueries;
	readonly reportFailure: FailureReport;
	readonly queryClient: QueryClient;
	readonly invalidations: Invalidations;
	readonly isModuleRequest: (request: AnyRequest) => boolean;
}

class ClientApp implements StartedApp {
	readonly queryClient: QueryClient;
	readonly watches: QueryWatches;
	readonly routes: RouteQueries;
	readonly reportFailure: FailureReport;
	private stopping: () => void = () => undefined;

	constructor(private readonly parts: ClientAppParts) {
		this.queryClient = parts.queryClient;
		this.routes = parts.routes;
		this.reportFailure = parts.reportFailure;
		this.watches = new QueryWatches(parts.queryClient, parts.routes);
	}

	send<R extends AnyRequest>(request: R, ...asked: [...InputArgs<R>, sending?: Sending]): Promise<Answer<OutputOf<R>>>;
	async send(request: AnyRequest, sent?: unknown, sending?: Sending): Promise<Answer<unknown>> {
		const answer = await this.parts.mediator.send(request, sent, sending);
		void this.reReadAfter(request, answer);
		return answer;
	}

	stopsWith(stop: () => void): void {
		this.stopping = stop;
	}

	stop(): void {
		this.stopping();
	}

	private async reReadAfter(request: AnyRequest, answer: Answer<unknown>): Promise<void> {
		if (this.parts.isModuleRequest(request)) {
			this.parts.invalidations.apply(answer.ok ? (answer.invalidated ?? []) : []);
			return;
		}

		// TODO: remove with the older module shape, whose commands re-read by .invalidates() or everything
		if (request.kind !== "command" || (!answer.ok && !answer.ran)) return;
		const listed = request.invalidated;
		if (listed === null) return this.queryClient.invalidateQueries();
		await Promise.all(listed.map((query) => this.queryClient.invalidateQueries({ queryKey: [query.name] })));
	}
}

function noServer(request: AnyRequest): Refusal {
	return refusalOf("no-server", NO_SERVER.replace("{name}", request.name));
}

function clientRoutesOf(start: AppStart, remote: ModuleReach | null): StartedRoutes {
	const facts = factsOf(start);
	const ready = start.modules.map((module) => readyModuleOf(module, undefined, facts));
	return routesOf({ side: "client", modules: ready, hasAuthenticate: false, hostProvided: {}, remote });
}

function factsOf({ platform, scope, env = {}, host = {} }: AppStart): ModuleFacts | null {
	if (platform === undefined || scope === undefined) {
		return null;
	}

	return { platform, scope, env, host: hostProvidedOf(host) };
}
