import { RPCLink } from "@orpc/client/fetch";
import { z } from "zod";
import { reasonOf, refusalOf } from "./answer";
import type { Answer } from "./answer";
import { InvalidationSchema } from "./invalidation";
import type { RemoteCall } from "./remote-server";
import type { HearChanges, RemoteTransport } from "./transport";
import { WIRE_CHANGES_PATH, WIRE_PREFIX, wireAnswerOf, wirePathOf } from "./wire";
import type { WireCall } from "./wire";

type Fetch = (request: Request) => Promise<Response>;

interface CallContext {
	readonly headers: Readonly<Record<string, string>>;
}

export interface WireHost {
	readonly fetch?: Fetch | undefined;
	readonly headers?: (() => Readonly<Record<string, string>>) | undefined;
}

const NOT_AN_ANSWER = "{name}: the server answered something that is not an answer";
const NOT_A_URL = 'the oRPC transport needs an absolute URL such as https://api.example.com, not "{url}"';
const CHANGES_LOST = "[widgetarium] the changes stream from {server} ended, so it is opened again in {ms} ms";
const CHANGES_AGAIN_MS = 1000;
const EVENT_END = "\n\n";
const DATA_LINE = "data: ";
const ChangedSchema = z.array(InvalidationSchema);

export function orpcTransport(server: string, host: WireHost = {}): RemoteTransport {
	if (!URL.canParse(server)) {
		throw new Error(NOT_A_URL.replace("{url}", server));
	}

	const link = linkTo(server, host);
	return {
		call: (call) => callOver(link, call),
		changes: (hear) => hearOver(server, host, hear),
	};
}

async function callOver(
	link: RPCLink<CallContext>,
	{ request, sent, idempotencyKey, signal, headers }: RemoteCall,
): Promise<Answer<unknown>> {
	const call: WireCall = { input: sent, idempotencyKey };
	try {
		const context = { headers: Object.fromEntries(headers ?? []) };
		const answered = await link.call(wirePathOf(request), call, { context, signal });
		return wireAnswerOf(answered) ?? refusalOf("unreachable", NOT_AN_ANSWER.replace("{name}", request.name));
	} catch (thrown) {
		return refusalOf("unreachable", reasonOf(thrown));
	}
}

function hearOver(server: string, host: WireHost, hear: HearChanges): () => void {
	const stopping = new AbortController();
	void readChangesUntil(server, host, { hear, signal: stopping.signal });
	return () => stopping.abort();
}

interface ChangesReading {
	readonly hear: HearChanges;
	readonly signal: AbortSignal;
}

async function readChangesUntil(server: string, host: WireHost, reading: ChangesReading): Promise<void> {
	while (!reading.signal.aborted) {
		await readChanges(server, host, reading).catch(() => undefined);

		if (reading.signal.aborted) {
			return;
		}

		console.warn(CHANGES_LOST.replace("{server}", server).replace("{ms}", String(CHANGES_AGAIN_MS)));
		await new Promise((settled) => setTimeout(settled, CHANGES_AGAIN_MS));
	}
}

async function readChanges(
	server: string,
	{ fetch = globalThis.fetch, headers }: WireHost,
	{ hear, signal }: ChangesReading,
): Promise<void> {
	const response = await fetch(new Request(new URL(WIRE_CHANGES_PATH, server), { headers: headers?.() ?? {}, signal }));
	const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader();

	if (reader === undefined) {
		return;
	}

	let held = "";

	for (let read = await reader.read(); !read.done; read = await reader.read()) {
		held += read.value;
		const events = held.split(EVENT_END);
		held = events.pop() ?? "";
		events.forEach((event) => hearEvent(event, hear));
	}
}

function hearEvent(event: string, hear: HearChanges): void {
	const data = event
		.split("\n")
		.filter((line) => line.startsWith(DATA_LINE))
		.map((line) => line.slice(DATA_LINE.length))
		.join("\n");
	const changed = data === "" ? null : ChangedSchema.safeParse(JSON.parse(data));

	if (changed?.success === true) {
		hear(changed.data);
	}
}

function linkTo(server: string, { fetch = globalThis.fetch, headers }: WireHost): RPCLink<CallContext> {
	return new RPCLink<CallContext>({
		origin: server,
		url: WIRE_PREFIX,
		fetch: (url, init) => fetch(new Request(url, init)),
		headers: ({ context }) => ({ ...headers?.(), ...context.headers }),
	});
}
