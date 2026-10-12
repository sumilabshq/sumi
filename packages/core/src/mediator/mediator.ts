import type { CommandAnswer } from "../gateway/run-handler";
import type { DoneKeys } from "./done-keys";
import type { AppHost, Handles, Middleware, RequestCall } from "./handles";
import { QueryStore } from "./query-store";
import type { AnyRequest, OutputOf, SentOf } from "./request";
import { issuesOf, parsedOutput, reasonOf, refused } from "./sends";
import type { App, SendOptions } from "./sends";

export interface Route {
	readonly handler: Handles<AnyRequest>;
	readonly use: readonly Middleware[];
}

interface Run {
	readonly route: Route;
	readonly request: AnyRequest;
	readonly input: unknown;
	readonly key: string | null;
	readonly signal: AbortSignal;
}

const NO_HANDLER = "{name} has no handler";
const NEVER_ABORTED = new AbortController().signal;

export class Mediator implements App {
	readonly queries: QueryStore = new QueryStore(this);

	constructor(
		private readonly routes: ReadonlyMap<string, Route>,
		private readonly host: AppHost,
		private readonly doneKeys: DoneKeys,
	) {}

	send<R extends AnyRequest>(request: R, input: SentOf<R>, options?: SendOptions): Promise<CommandAnswer<OutputOf<R>>>;
	async send(request: AnyRequest, input: unknown, options: SendOptions = {}): Promise<CommandAnswer<unknown>> {
		const route = this.routes.get(request.name);
		if (route === undefined) return refused(NO_HANDLER.replace("{name}", request.name), false);
		const parsed = request.input.safeParse(input);
		if (!parsed.success) return refused(issuesOf(request.name, "input", parsed.error), false);
		const key = keyOf(request, parsed.data, options.idempotencyKey);
		const run = { route, request, input: parsed.data, key, signal: options.signal ?? NEVER_ABORTED };
		const answer =
			key === null ? await this.run(run) : await this.doneKeys.once(`${request.name}:${key}`, () => this.run(run));
		if (request.kind === "command" && (answer.ok || answer.ran)) this.queries.reread(request.module);
		return answer;
	}

	private async run({ route, request, input, key, signal }: Run): Promise<CommandAnswer<unknown>> {
		const ctx = { idempotencyKey: key, signal, host: this.host };
		const call: RequestCall = { request, input, ctx };
		try {
			const returned = await throughMiddleware(route.use, call, () => route.handler.handle(input, ctx));
			return parsedOutput(request, returned);
		} catch (thrown) {
			console.error(`[widgetarium] ${request.name} threw`, thrown);
			return refused(reasonOf(thrown), false);
		}
	}
}

function keyOf(request: AnyRequest, input: unknown, given: string | undefined): string | null {
	if (request.kind === "query" || request.idempotencyKey === "none") return null;
	if (request.idempotencyKey === "per-call") return given ?? crypto.randomUUID();
	return request.idempotencyKey(input);
}

function throughMiddleware(
	use: readonly Middleware[],
	call: RequestCall,
	last: () => Promise<unknown>,
): Promise<unknown> {
	const chained = use.reduceRight<() => Promise<unknown>>((next, middleware) => () => middleware(call, next), last);
	return chained();
}
