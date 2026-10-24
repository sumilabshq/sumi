import type { Refusal } from "./answer";
import { refusalOfThrown } from "./answer";
import { NEVER_ABORTED } from "./handler";
import type { CallFacts } from "./handler";
import { callerRefusalOf } from "./local-routes";
import type { LocalRoutes, Route } from "./local-routes";
import type { ModuleReach } from "./remote-modules";
import { reportRefusal } from "./report-failure";
import type { FailureReport } from "./report-failure";
import type { AnyRequest } from "./request";

export interface SettledNow {
	readonly output: unknown;
}

export type Missing = (request: AnyRequest) => Refusal;

interface RouteQueriesParts {
	readonly local: LocalRoutes;
	readonly remote: ModuleReach | null;
	readonly missing: Missing;
	readonly reportFailure: FailureReport;
}

const NO_FACTS: CallFacts = { idempotencyKey: null, signal: NEVER_ABORTED, user: null };

export const NOT_WATCHED = (): void => undefined;

export class RouteQueries {
	constructor(private readonly parts: RouteQueriesParts) {}

	isLocal(request: AnyRequest): boolean {
		return this.parts.local.routeOf(request) !== undefined;
	}

	cannotRun(request: AnyRequest): string | null {
		if (this.isLocal(request) || this.parts.remote?.reachesModule(request.module ?? "") === true) return null;
		return this.parts.missing(request).reason;
	}

	readNow(request: AnyRequest, sent?: unknown): SettledNow | null {
		const route = this.viewRouteOf(request);
		if (route === undefined || request.kind !== "query" || !request.isSettledNow) return null;
		const input = request.inputSchema.safeParse(sent);
		if (!input.success) return null;
		try {
			return settledOf(request, route.handler.handle(input.data, { ...route.provided, ...NO_FACTS }));
		} catch (thrown) {
			reportRefusal(this.parts.reportFailure, request.name, refusalOfThrown(thrown, false), thrown);
			return null;
		}
	}

	watch(request: AnyRequest, sent: unknown, changed: () => void): () => void {
		const route = this.viewRouteOf(request);
		const input = request.inputSchema.safeParse(sent);
		if (route?.handler.watch == null || !input.success) return NOT_WATCHED;
		return route.handler.watch(input.data, route.provided, changed);
	}

	private viewRouteOf(request: AnyRequest): Route | undefined {
		const route = this.parts.local.routeOf(request);
		return route === undefined || callerRefusalOf(route, undefined) !== null ? undefined : route;
	}
}

function settledOf(request: AnyRequest, returned: unknown): SettledNow | null {
	if (returned instanceof Promise) return null;
	const output = request.outputSchema.safeParse(returned);
	return output.success ? { output: output.data } : null;
}
