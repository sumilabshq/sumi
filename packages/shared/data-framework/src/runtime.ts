import { QueryClient } from "@tanstack/react-query";
import { refusalOf } from "./answer";
import type { Answer, Refusal } from "./answer";
import { MemoryDoneKeys } from "./done-keys";
import type { DoneKeys } from "./done-keys";
import { EventBus } from "./event-bus";
import { exposedOf } from "./exposure";
import type { Exposed, Exposing } from "./exposure";
import { Invalidations } from "./invalidation";
import type { Invalidation } from "./invalidation";
import { LocalRoutes } from "./local-routes";
import { Mediator, VIEW_CALLER } from "./mediator";
import type { Sending } from "./mediator";
import { RequestsModule, readyModuleOf } from "./module";
import type { HandledModule, Provided, ReadyModule, ServerParts, StartableModule } from "./module";
import type { RemoteModule } from "./module-contract";
import { listenedEventNames, startModuleEvents } from "./module-events";
import type { DeviceRuns, ServerRuns } from "./placement";
import type { ModuleFacts, ModuleScope, Platform, RunnableModule } from "./platform-module";
import { QueryWatches } from "./query-watches";
import { RemoteModules } from "./remote-modules";
import { reportToConsole } from "./report-failure";
import type { FailureReport } from "./report-failure";
import type { AnyRequest, InputArgs, OutputOf } from "./request";
import { RouteQueries } from "./route-queries";
import { provideDefaultRuntime } from "./runtime-provides";
import type { ProvideRuntime, RuntimeFacts, RuntimeProviding } from "./runtime-provides";
import { routesOf } from "./startup";
import type { StartedRoutes } from "./startup";
import { ChangeBroadcast } from "./transport";

export interface RuntimeHost {
	readonly reportFailure?: FailureReport;
	readonly doneKeys?: DoneKeys;
}

export interface RuntimeStartOptions {
	readonly platform?: Platform;
	readonly scope?: ModuleScope;
	readonly env?: ServerParts["env"];
	readonly host?: RuntimeHost;
}

export interface Runtime {
	readonly queryClient: QueryClient;
	readonly reportFailure: FailureReport;
	readonly routes: RouteQueries;
	readonly watches: QueryWatches;
	send<R extends AnyRequest>(request: R, ...asked: [...InputArgs<R>, sending?: Sending]): Promise<Answer<OutputOf<R>>>;
	expose(exposing: Exposing): Exposed;
	stop(): void;
}

export type DeviceModule = RunnableModule<Provided, DeviceRuns> | HandledModule<void> | ReadyModule;

export type ServerSideModule = RunnableModule<Provided, ServerRuns> | HandledModule<ServerParts> | ReadyModule;

interface RuntimePlan {
	readonly ranModules: readonly StartableModule[];
	readonly remoteModules: readonly RemoteModule[];
	readonly provideRuntime: ProvideRuntime;
}

const UNREACHED = "{name} runs on no module of this runtime, and no import reaches it";

export class RuntimeBuilder {
	constructor(private readonly plan: RuntimePlan) {}

	modules(...modules: readonly StartableModule[]): RuntimeBuilder {
		return new RuntimeBuilder({ ...this.plan, ranModules: [...this.plan.ranModules, ...modules] });
	}

	imports(...modules: readonly RemoteModule[]): RuntimeBuilder {
		return new RuntimeBuilder({ ...this.plan, remoteModules: [...this.plan.remoteModules, ...modules] });
	}

	provide(provideRuntime: RuntimeProviding): RuntimeBuilder {
		return new RuntimeBuilder({ ...this.plan, provideRuntime });
	}

	start(options: RuntimeStartOptions = {}): Runtime {
		return startRuntime(this.plan, options);
	}
}

export function runtime(): RuntimeBuilder {
	return new RuntimeBuilder({ ranModules: [], remoteModules: [], provideRuntime: provideDefaultRuntime });
}

function startRuntime(plan: RuntimePlan, start: RuntimeStartOptions): Runtime {
	const reportFailure = start.host?.reportFailure ?? reportToConsole;
	const remote = new RemoteModules(plan.remoteModules, unreached);
	const facts = runtimeFactsOf(start);
	const started = startedRoutesOf(plan, facts, remote);
	const bus = new EventBus(reportFailure);
	const doneKeys = start.host?.doneKeys ?? new MemoryDoneKeys();
	const local = new LocalRoutes({ routes: started.routes, doneKeys, bus });
	const mediator = new Mediator({ local, remote, missing: unreached, reportFailure });
	const queryClient = new QueryClient();
	const invalidations = new Invalidations(queryClient);
	const changed = new ChangeBroadcast();
	const announce = (invalidated: readonly Invalidation[] | undefined): void => {
		invalidations.apply(invalidated ?? []);
		changed.tell(invalidated);
	};
	const routes = new RouteQueries({ local, remote, missing: unreached, reportFailure, invalidations });
	const modules = started.modules.map(({ module, provided }) => ({ definition: module.definition, provided }));
	const stopHearing = remote.changes((invalidated) => invalidations.apply(invalidated));
	const stopEvents = startModuleEvents({
		modules,
		listened: listenedEventNames(modules),
		platform: facts.platform,
		bus,
		sender: mediator,
		reportFailure,
		applyInvalidations: announce,
	});
	return new StartedRuntime({
		started,
		mediator,
		routes,
		reportFailure,
		queryClient,
		invalidations,
		changed,
		announce,
		isModuleRequest: (request) =>
			local.routeOf(request)?.handler.module instanceof RequestsModule || remote.forwards(request),
		stop: () => {
			stopHearing();
			stopEvents();
		},
	});
}

interface RuntimeParts {
	readonly started: StartedRoutes;
	readonly mediator: Mediator;
	readonly routes: RouteQueries;
	readonly reportFailure: FailureReport;
	readonly queryClient: QueryClient;
	readonly invalidations: Invalidations;
	readonly changed: ChangeBroadcast;
	readonly announce: (invalidated: readonly Invalidation[] | undefined) => void;
	readonly isModuleRequest: (request: AnyRequest) => boolean;
	readonly stop: () => void;
}

class StartedRuntime implements Runtime {
	readonly queryClient: QueryClient;
	readonly watches: QueryWatches;
	readonly routes: RouteQueries;
	readonly reportFailure: FailureReport;

	constructor(private readonly parts: RuntimeParts) {
		this.queryClient = parts.queryClient;
		this.routes = parts.routes;
		this.reportFailure = parts.reportFailure;
		this.watches = new QueryWatches(parts.queryClient, parts.routes);
	}

	send<R extends AnyRequest>(request: R, ...asked: [...InputArgs<R>, sending?: Sending]): Promise<Answer<OutputOf<R>>>;
	async send(request: AnyRequest, sent?: unknown, sending?: Sending): Promise<Answer<unknown>> {
		const answer = await this.parts.mediator.send(request, sent, { ...sending, inProcessCaller: VIEW_CALLER });
		this.parts.changed.tell(answer.ok ? answer.invalidated : undefined);
		void this.reReadAfter(request, answer);
		return answer;
	}

	expose(exposing: Exposing): Exposed {
		const { started, mediator, announce, changed } = this.parts;
		return exposedOf({ routes: started.routes, mediator, announce, changed }, exposing);
	}

	stop(): void {
		this.parts.stop();
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

function unreached(request: AnyRequest): Refusal {
	return refusalOf("no-server", UNREACHED.replace("{name}", request.name));
}

function runtimeFactsOf({ platform, scope, env = {} }: RuntimeStartOptions): RuntimeFacts {
	return { platform: platform ?? null, scope: scope ?? null, env };
}

function startedRoutesOf(plan: RuntimePlan, facts: RuntimeFacts, remote: RemoteModules): StartedRoutes {
	const ready = plan.ranModules.map((module) => readyModuleOf(module, { env: facts.env }, moduleFactsOf(facts)));
	const runtimeProvided = plan.provideRuntime(facts);
	return routesOf({ platform: facts.platform, modules: ready, runtimeProvided, remote });
}

function moduleFactsOf({ platform, scope, env }: RuntimeFacts): ModuleFacts | null {
	if (platform === null || scope === null) {
		return null;
	}

	return { platform, scope, env };
}
