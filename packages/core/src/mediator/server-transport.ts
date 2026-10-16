import type { CommandAnswer } from "../gateway/run-handler";
import type { AnyRequest } from "./request";

export interface ServerCall {
	readonly request: AnyRequest;
	readonly input: unknown;
	readonly idempotencyKey: string | null;
	readonly signal: AbortSignal;
}

export abstract class ServerTransport {
	abstract send(call: ServerCall): Promise<CommandAnswer<unknown>>;
}

const NO_SERVER = "{name} runs on the server, and no server is configured for this app";

// TODO: a tRPC transport posting to /rpc/<name> once apps/server exists.
export class NoServerTransport extends ServerTransport {
	override async send({ request }: ServerCall): Promise<CommandAnswer<unknown>> {
		return { ok: false, reason: NO_SERVER.replace("{name}", request.name), ran: false };
	}
}
