import { RPCLink } from "@orpc/client/fetch";
import { reasonOf, refusalOf } from "./answer";
import type { Answer } from "./answer";
import type { Remote, RemoteCall } from "./mediator";
import { WIRE_PREFIX, wireAnswerOf, wirePathOf } from "./wire";
import type { WireCall } from "./wire";

type Fetch = (request: Request) => Promise<Response>;

export interface WireHost {
	readonly fetch?: Fetch | undefined;
	readonly headers?: (() => Readonly<Record<string, string>>) | undefined;
}

const NOT_AN_ANSWER = "{name}: the server answered something that is not an answer";

export function remoteOver(server: string, host: WireHost): Remote {
	const link = linkTo(server, host);
	return async ({ request, sent, idempotencyKey, signal }: RemoteCall): Promise<Answer<unknown>> => {
		const call: WireCall = { input: sent, idempotencyKey };
		try {
			const answered = await link.call(wirePathOf(request), call, { context: {}, signal });
			return wireAnswerOf(answered) ?? refusalOf("unreachable", NOT_AN_ANSWER.replace("{name}", request.name));
		} catch (thrown) {
			return refusalOf("unreachable", reasonOf(thrown));
		}
	};
}

function linkTo(server: string, { fetch = globalThis.fetch, headers }: WireHost): RPCLink<Record<never, never>> {
	return new RPCLink({
		origin: server,
		url: WIRE_PREFIX,
		fetch: (url, init) => fetch(new Request(url, init)),
		...(headers === undefined ? {} : { headers: () => ({ ...headers() }) }),
	});
}
