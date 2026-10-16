import { QueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { stableKey } from "../gateway/stable-key";
import type { Answer } from "./answer";
import { MemoryDoneKeys } from "./done-keys";
import type { DoneKeys } from "./done-keys";
import { Mediator, NOT_WATCHED } from "./mediator";
import type { Sending, SettledNow } from "./mediator";
import { readyModuleOf } from "./module";
import type { StartableModule } from "./module";
import { reportToConsole } from "./report-failure";
import type { FailureReport } from "./report-failure";
import type { AnyQuery, AnyRequest, InputArgs, OutputOf } from "./request";
import { routesOf } from "./startup";
import { remoteOver } from "./wire-client";
import type { WireHost } from "./wire-client";

export interface AppHost extends WireHost {
	readonly reportFailure?: FailureReport;
	readonly doneKeys?: DoneKeys;
}

export interface AppStart {
	readonly modules: readonly StartableModule[];
	readonly server?: string | undefined;
	readonly host?: AppHost;
}

export interface StartedApp {
	readonly queryClient: QueryClient;
	readonly reportFailure: FailureReport;
	send<R extends AnyRequest>(request: R, ...asked: [...InputArgs<R>, sending?: Sending]): Promise<Answer<OutputOf<R>>>;
	readNow(request: AnyRequest, sent?: unknown): SettledNow | null;
	watch(request: AnyQuery, sent: unknown): () => void;
	isLocal(request: AnyRequest): boolean;
	cannotRun(request: AnyRequest): string | null;
}

interface Watched {
	readonly stop: () => void;
	count: number;
}

export function queryKeyOf(request: AnyRequest, sent: unknown): QueryKey {
	return [request.name, stableKey(sent)];
}

export function app({ modules, server, host = {} }: AppStart): StartedApp {
	const reportFailure = host.reportFailure ?? reportToConsole;
	const ready = modules.map((module) => readyModuleOf(module, undefined));
	const mediator = new Mediator({
		routes: routesOf({ side: "client", modules: ready, hasAuthenticate: false }),
		remote: server === undefined ? null : remoteOver(server, host),
		policies: null,
		doneKeys: host.doneKeys ?? new MemoryDoneKeys(),
		reportFailure,
	});
	return new ClientApp(mediator, reportFailure);
}

class ClientApp implements StartedApp {
	readonly queryClient = new QueryClient();
	private readonly watches = new Map<string, Watched>();

	constructor(
		private readonly mediator: Mediator,
		readonly reportFailure: FailureReport,
	) {}

	send<R extends AnyRequest>(request: R, ...asked: [...InputArgs<R>, sending?: Sending]): Promise<Answer<OutputOf<R>>>;
	async send(request: AnyRequest, sent?: unknown, sending?: Sending): Promise<Answer<unknown>> {
		const answer = await this.mediator.send(request, sent, sending);
		void this.reReadAfter(request, answer);
		return answer;
	}

	readNow(request: AnyRequest, sent?: unknown): SettledNow | null {
		return this.mediator.readNow(request, sent);
	}

	watch(request: AnyQuery, sent: unknown): () => void {
		const queryKey = queryKeyOf(request, sent);
		const reRead = (): void => void this.queryClient.invalidateQueries({ queryKey, exact: true });
		return watchedOnce(this.watches, queryKey, () => {
			const stop = this.mediator.watch(request, sent, reRead);
			if (stop !== NOT_WATCHED) reRead();
			return stop;
		});
	}

	isLocal(request: AnyRequest): boolean {
		return this.mediator.isLocal(request);
	}

	cannotRun(request: AnyRequest): string | null {
		return this.mediator.cannotRun(request);
	}

	private async reReadAfter(request: AnyRequest, answer: Answer<unknown>): Promise<void> {
		if (request.kind !== "command" || (!answer.ok && !answer.ran)) return;
		const listed = request.invalidated;
		if (listed === null) return this.queryClient.invalidateQueries();
		await Promise.all(listed.map((query) => this.queryClient.invalidateQueries({ queryKey: [query.name] })));
	}
}

function watchedOnce(watches: Map<string, Watched>, key: QueryKey, start: () => () => void): () => void {
	const hash = JSON.stringify(key);
	const known = watches.get(hash) ?? { stop: start(), count: 0 };
	known.count += 1;
	watches.set(hash, known);
	return () => {
		known.count -= 1;
		if (known.count > 0 || watches.get(hash) !== known) return;
		known.stop();
		watches.delete(hash);
	};
}
