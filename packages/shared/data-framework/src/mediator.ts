import { issuesOf, reasonOf, refusalOf } from "./answer";
import type { Answer, Refusal } from "./answer";
import type { User } from "./guard";
import type { Invalidation } from "./invalidation";
import { refuseCaller } from "./local-routes";
import type { LocalRoutes, Route } from "./local-routes";
import type { ModuleReach } from "./remote-modules";
import { reportRefusal } from "./report-failure";
import type { FailureReport } from "./report-failure";
import type { AnyRequest } from "./request";
import type { Missing } from "./route-queries";

export interface Sending {
	readonly idempotencyKey?: string | undefined;
	readonly signal?: AbortSignal | undefined;
	readonly headers?: Headers | undefined;
}

export interface MediatedSending extends Sending {
	readonly inProcessCaller?: InProcessCaller | undefined;
	readonly outsideCaller?: OutsideCaller | undefined;
}

export interface InProcessCaller {
	readonly module: string | null;
}

export interface OutsideCaller {
	user(): Promise<User | null>;
}

export const VIEW_CALLER: InProcessCaller = Object.freeze({ module: null });

export interface Asked {
	readonly request: AnyRequest;
	readonly sent: unknown;
	readonly input: unknown;
	readonly sending: MediatedSending;
	readonly givenKey: string | undefined;
}

export interface Settle {
	held(request: AnyRequest, returned: unknown, ran?: boolean, invalidated?: readonly Invalidation[]): Answer<unknown>;
	refuse(request: AnyRequest, refusal: Refusal, thrown?: unknown): Refusal;
	shared(key: string, run: () => Promise<Answer<unknown>>): Promise<Answer<unknown>>;
	send(request: AnyRequest, sent: unknown, sending?: MediatedSending): Promise<Answer<unknown>>;
}

interface MediatorParts {
	readonly local: LocalRoutes;
	readonly remote: ModuleReach | null;
	readonly missing: Missing;
	readonly reportFailure: FailureReport;
}

export class Mediator implements Settle {
	private readonly running = new Map<string, Promise<Answer<unknown>>>();

	constructor(private readonly parts: MediatorParts) {}

	async send(request: AnyRequest, sent: unknown, sending: MediatedSending = {}): Promise<Answer<unknown>> {
		try {
			const route = this.parts.local.routeOf(request);
			const refusedCaller = route === undefined ? null : refuseCaller(route, sending.inProcessCaller);
			if (refusedCaller !== null) return this.refuse(request, refusedCaller);
			const input = request.inputSchema.safeParse(sent);
			if (!input.success)
				return this.refuse(request, refusalOf("invalid-input", issuesOf(request.name, "input", input.error)));
			return await this.routed(route, { request, sent, input: input.data, sending, givenKey: this.givenKeyOf(sending) });
		} catch (thrown) {
			return this.refuse(request, refusalOf("failed", reasonOf(thrown)), thrown);
		}
	}

	held(request: AnyRequest, returned: unknown, ran = false, invalidated?: readonly Invalidation[]): Answer<unknown> {
		const output = request.outputSchema.safeParse(returned);
		if (output.success) {
			return invalidated === undefined
				? { ok: true, output: output.data }
				: { ok: true, output: output.data, invalidated };
		}
		return this.refuse(request, refusalOf("invalid-output", issuesOf(request.name, "output", output.error), ran));
	}

	refuse(request: AnyRequest, refusal: Refusal, thrown: unknown = null): Refusal {
		return reportRefusal(this.parts.reportFailure, request.name, refusal, thrown);
	}

	shared(key: string, run: () => Promise<Answer<unknown>>): Promise<Answer<unknown>> {
		const known = this.running.get(key);
		if (known !== undefined) return known;
		const answer = run().finally(() => this.running.delete(key));
		this.running.set(key, answer);
		return answer;
	}

	private routed(route: Route | undefined, asked: Asked): Promise<Answer<unknown>> {
		const { local, remote, missing } = this.parts;
		if (route !== undefined) return local.run(route, asked, this);
		if (remote?.reachesModule(asked.request.module ?? "") === true) return remote.run(asked, this);
		return Promise.resolve(this.refuse(asked.request, missing(asked.request)));
	}

	private givenKeyOf({ idempotencyKey, outsideCaller }: MediatedSending): string | undefined {
		if (idempotencyKey !== undefined || outsideCaller !== undefined) return idempotencyKey;
		return crypto.randomUUID();
	}
}
