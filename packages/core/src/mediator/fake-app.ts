import type { CommandAnswer } from "../gateway/run-handler";
import { QueryStore } from "./query-store";
import type { AnyRequest, OutputOf, SentOf } from "./request";
import { issuesOf, parsedOutput, refused } from "./sends";
import type { App, SendOptions } from "./sends";

export interface FakeAnswers {
	readonly answers: Readonly<Record<string, unknown>>;
}

const NO_ANSWER = "{name} has no answer in this design state";

export function fakeApp({ answers }: FakeAnswers): App {
	return new FakeMediator(answers);
}

class FakeMediator implements App {
	readonly queries: QueryStore = new QueryStore(this);

	constructor(private readonly answers: Readonly<Record<string, unknown>>) {}

	send<R extends AnyRequest>(request: R, input: SentOf<R>, options?: SendOptions): Promise<CommandAnswer<OutputOf<R>>>;
	async send(request: AnyRequest, input: unknown): Promise<CommandAnswer<unknown>> {
		const parsed = request.input.safeParse(input);
		if (!parsed.success) return refused(issuesOf(request.name, "input", parsed.error), false);
		if (!(request.name in this.answers) && request.kind === "query")
			return refused(NO_ANSWER.replace("{name}", request.name), false);
		const answer = parsedOutput(request, this.answers[request.name]);
		if (request.kind === "command") this.queries.reread(request.module);
		return answer;
	}
}
