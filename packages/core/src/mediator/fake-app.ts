import type { CommandAnswer } from "../gateway/run-handler";
import { QueryStore } from "./query-store";
import { reportToConsole } from "./report-failure";
import type { FailureReport } from "./report-failure";
import type { AnyRequest, OutputOf, SentOf } from "./request";
import { NOT_WATCHED, issuesOf, parsedOutput, refused } from "./sends";
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
	readonly reportFailure: FailureReport = reportToConsole;

	constructor(private readonly answers: Readonly<Record<string, unknown>>) {}

	send<R extends AnyRequest>(request: R, input: SentOf<R>, options?: SendOptions): Promise<CommandAnswer<OutputOf<R>>>;
	async send(request: AnyRequest, input: unknown): Promise<CommandAnswer<unknown>> {
		const answer = this.answerOf(request, input);
		if (!answer.ok) this.reportFailure({ source: request.name, reason: answer.reason, ran: answer.ran, thrown: null });
		this.queries.afterCommand(request, answer);
		return answer;
	}

	watch(): () => void {
		return NOT_WATCHED;
	}

	private answerOf(request: AnyRequest, input: unknown): CommandAnswer<unknown> {
		const parsed = request.input.safeParse(input);
		if (!parsed.success) return refused(issuesOf(request.name, "input", parsed.error), false);
		if (!(request.name in this.answers) && request.kind === "query")
			return refused(NO_ANSWER.replace("{name}", request.name), false);
		return parsedOutput(request, this.answers[request.name]);
	}
}
