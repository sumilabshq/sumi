import { stableKey } from "../gateway/stable-key";
import type { Answer } from "./answer";
import { NEVER_ABORTED } from "./handler";
import type { Asked, Settle } from "./mediator";
import { keyRead } from "./policies";
import type { AnyRequest } from "./request";

export interface RemoteCall {
	readonly request: AnyRequest;
	readonly sent: unknown;
	readonly idempotencyKey: string | null;
	readonly signal: AbortSignal;
}

export type Remote = (call: RemoteCall) => Promise<Answer<unknown>>;

export class RemoteServer {
	constructor(private readonly remote: Remote) {}

	run({ request, sent, input, sending, givenKey }: Asked, settle: Settle): Promise<Answer<unknown>> {
		const read = keyRead(request, input, givenKey);
		if ("refusal" in read) return Promise.resolve(settle.refuse(request, read.refusal));
		const call = { request, sent, idempotencyKey: read.key, signal: sending.signal ?? NEVER_ABORTED };
		const answer = () => this.answerOf(call, settle);
		if (request.kind !== "query") return answer();
		return settle.shared(`${request.name} ${stableKey(sent)}`, answer);
	}

	private async answerOf(call: RemoteCall, settle: Settle): Promise<Answer<unknown>> {
		const answer = await this.remote(call);
		return answer.ok ? settle.held(call.request, answer.output) : settle.refuse(call.request, answer);
	}
}
