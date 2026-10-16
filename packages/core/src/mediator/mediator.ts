import type { CommandAnswer } from "../gateway/run-handler";
import type { DoneKeys } from "./done-keys";
import type { Handles, Middleware, RequestCall } from "./handles";
import { idempotencyKeyOf } from "./idempotency-key";
import { frozen, throughMiddleware } from "./middleware-chain";
import type { AnyHost } from "./platform";
import { QueryStore } from "./query-store";
import type { FailureReport } from "./report-failure";
import type { AnyQuery, AnyRequest, OutputOf, SentOf } from "./request";
import { NOT_WATCHED, issuesOf, parsedOutput, reasonOf, refused } from "./sends";
import type { App, SendOptions } from "./sends";
import type { ServerTransport } from "./server-transport";

export interface Route {
	readonly handler: Handles<AnyRequest>;
	readonly use: readonly Middleware[];
}

export interface MediatorNeeds {
	readonly host: AnyHost;
	readonly doneKeys: DoneKeys;
	readonly reportFailure: FailureReport;
	readonly transport: ServerTransport;
}

interface Sent {
	readonly request: AnyRequest;
	readonly input: unknown;
	readonly key: string | null;
	readonly signal: AbortSignal;
}

const NO_HANDLER = "no module handles {name}";
const NEVER_ABORTED = new AbortController().signal;

export class Mediator implements App {
	readonly queries: QueryStore = new QueryStore(this);
	readonly reportFailure: FailureReport;
	private routes: ReadonlyMap<string, Route> = new Map();

	constructor(private readonly needs: MediatorNeeds) {
		this.reportFailure = needs.reportFailure;
	}

	route(routes: ReadonlyMap<string, Route>): void {
		this.routes = routes;
	}

	send<R extends AnyRequest>(request: R, input: SentOf<R>, options?: SendOptions): Promise<CommandAnswer<OutputOf<R>>>;
	async send(request: AnyRequest, input: unknown, options: SendOptions = {}): Promise<CommandAnswer<unknown>> {
		const answer = await this.answerOf(request, input, options);
		this.queries.afterCommand(request, answer);
		return answer;
	}

	watch(request: AnyQuery, input: unknown, changed: () => void): () => void {
		const handler = this.routes.get(request.name)?.handler;
		const parsed = request.input.safeParse(input);
		if (handler === undefined || !parsed.success) return NOT_WATCHED;
		return handler.watch({ input: parsed.data, changed });
	}

	private async answerOf(request: AnyRequest, input: unknown, options: SendOptions): Promise<CommandAnswer<unknown>> {
		const route = this.routes.get(request.name);
		const isRemote = request.side === "server" && this.needs.host.platform !== "server";
		if (route === undefined && !isRemote) return this.refuse(request, NO_HANDLER.replace("{name}", request.name), null);
		try {
			const parsed = request.input.safeParse(input);
			if (!parsed.success) return this.refuse(request, issuesOf(request.name, "input", parsed.error), null);
			const key = idempotencyKeyOf(request, parsed.data, options.idempotencyKey);
			const sent: Sent = { request, input: frozen(parsed.data), key, signal: options.signal ?? NEVER_ABORTED };
			const run = () => (isRemote || route === undefined ? this.runRemote(sent) : this.run(route, sent));
			return key === null ? await run() : await this.needs.doneKeys.once(`${request.name}:${key}`, run);
		} catch (thrown) {
			return this.refuse(request, reasonOf(thrown), thrown);
		}
	}

	private async runRemote({ request, input, key, signal }: Sent): Promise<CommandAnswer<unknown>> {
		const answer = await this.needs.transport.send({ request, input, idempotencyKey: key, signal });
		if (!answer.ok) return this.refuse(request, answer.reason, null, answer.ran);
		const parsed = parsedOutput(request, answer.output);
		return parsed.ok ? parsed : this.refuse(request, parsed.reason, null, parsed.ran);
	}

	private async run(route: Route, { request, input, key, signal }: Sent): Promise<CommandAnswer<unknown>> {
		const ctx = Object.freeze({ idempotencyKey: key, signal, host: this.needs.host });
		const call: RequestCall = Object.freeze({ request, input, ctx });
		const entered = { handler: false };
		try {
			const returned = await throughMiddleware(route.use, call, () => {
				entered.handler = true;
				return route.handler.handle(input, ctx);
			});
			const answer = parsedOutput(request, returned);
			return answer.ok ? answer : this.refuse(request, answer.reason, null, answer.ran);
		} catch (thrown) {
			return this.refuse(request, reasonOf(thrown), thrown, entered.handler && request.kind === "command");
		}
	}

	private refuse(request: AnyRequest, reason: string, thrown: unknown, ran = false): CommandAnswer<unknown> {
		this.reportFailure({ source: request.name, reason, ran, thrown });
		return refused(reason, ran);
	}
}
