import type { CommandAnswer } from "../gateway/run-handler";
import type { DoneKeys } from "./done-keys";
import type { AppHost, Handles, Middleware, RequestCall } from "./handles";
import { idempotencyKeyOf } from "./idempotency-key";
import { frozen, throughMiddleware } from "./middleware-chain";
import { QueryStore } from "./query-store";
import type { ReportFailure } from "./report-failure";
import type { AnyRequest, OutputOf, SentOf } from "./request";
import { issuesOf, parsedOutput, reasonOf, refused } from "./sends";
import type { App, SendOptions } from "./sends";

export interface Route {
	readonly handler: Handles<AnyRequest>;
	readonly use: readonly Middleware[];
}

export interface MediatorNeeds {
	readonly host: AppHost;
	readonly doneKeys: DoneKeys;
	readonly reportFailure: ReportFailure;
}

const NO_HANDLER = "{name} has no handler";
const NEVER_ABORTED = new AbortController().signal;

export class Mediator implements App {
	readonly queries: QueryStore = new QueryStore(this);
	readonly reportFailure: ReportFailure;

	constructor(
		private readonly routes: ReadonlyMap<string, Route>,
		private readonly needs: MediatorNeeds,
	) {
		this.reportFailure = needs.reportFailure;
	}

	send<R extends AnyRequest>(request: R, input: SentOf<R>, options?: SendOptions): Promise<CommandAnswer<OutputOf<R>>>;
	async send(request: AnyRequest, input: unknown, options: SendOptions = {}): Promise<CommandAnswer<unknown>> {
		const answer = await this.answerOf(request, input, options);
		this.queries.afterCommand(request, answer);
		return answer;
	}

	private async answerOf(request: AnyRequest, input: unknown, options: SendOptions): Promise<CommandAnswer<unknown>> {
		const route = this.routes.get(request.name);
		if (route === undefined) return this.refuse(request, NO_HANDLER.replace("{name}", request.name), null);
		try {
			const parsed = request.input.safeParse(input);
			if (!parsed.success) return this.refuse(request, issuesOf(request.name, "input", parsed.error), null);
			const key = idempotencyKeyOf(request, parsed.data, options.idempotencyKey);
			const run = () => this.run(route, request, frozen(parsed.data), key, options.signal ?? NEVER_ABORTED);
			return key === null ? await run() : await this.needs.doneKeys.once(`${request.name}:${key}`, run);
		} catch (thrown) {
			return this.refuse(request, reasonOf(thrown), thrown);
		}
	}

	private async run(
		route: Route,
		request: AnyRequest,
		input: unknown,
		key: string | null,
		signal: AbortSignal,
	): Promise<CommandAnswer<unknown>> {
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
