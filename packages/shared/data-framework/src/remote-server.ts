import { stableKey } from "./gateway/stable-key";
import type { Answer } from "./answer";
import { NEVER_ABORTED } from "./handler";
import { wireNameOf } from "./identity";
import type { Asked, Settle } from "./mediator";
import { keyRead } from "./policies";
import type { AnyRequest } from "./request";

export interface RemoteCall {
	readonly name: string;
	readonly request: AnyRequest;
	readonly sent: unknown;
	readonly idempotencyKey: string | null;
	readonly signal: AbortSignal;
	readonly headers?: Headers | undefined;
}

export type Remote = (call: RemoteCall) => Promise<Answer<unknown>>;

export class RemoteServer {
	constructor(
		private readonly remote: Remote,
		private readonly prefix: string | null,
	) {}

	run({ request, sent, input, sending, givenKey }: Asked, settle: Settle): Promise<Answer<unknown>> {
		const read = keyRead(request, input, givenKey);
		if ("refusal" in read) return Promise.resolve(settle.refuse(request, read.refusal));
		const { headers } = sending;
		const name = wireNameOf(this.prefix, request.name);
		const call = { name, request, sent, idempotencyKey: read.key, signal: sending.signal ?? NEVER_ABORTED, headers };
		const answer = () => this.answerOf(call, settle);
		if (request.kind !== "query") return answer();
		return settle.shared(`${name} ${stableKey(sent)} ${stableKey([...(headers ?? [])])}`, answer);
	}

	private async answerOf(call: RemoteCall, settle: Settle): Promise<Answer<unknown>> {
		const answer = await this.remote(call);
		return answer.ok
			? settle.held(call.request, answer.output, false, answer.invalidated)
			: settle.refuse(call.request, answer);
	}
}
