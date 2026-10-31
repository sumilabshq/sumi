import { z } from "zod";
import { reasonOf, refusalOf } from "./answer";
import type { Answer } from "./answer";
import { InvalidationSchema } from "./invalidation";
import type { RemoteCall } from "./remote-server";
import { ChangeBroadcast } from "./transport";
import type { HearChanges, ListeningTransport, RemoteTransport, ServingServer } from "./transport";
import { wireAnswerOf } from "./wire";

export const PORT_WANTED = "widgetarium:port-wanted";

const PORT_GIVEN = "widgetarium:port-given";
const PORT_WAIT_MS = 10_000;
const NO_PORT = "no window above this page handed it a port within {ms} ms; is it opened inside Sumi?";
const NOT_AN_ANSWER = "{name}: the port answered something that is not an answer";
const NOT_A_CALL = "[widgetarium] a call reached the port in a shape it does not read";

const PortCallSchema = z.object({
	id: z.number(),
	name: z.string(),
	input: z.unknown().optional(),
	idempotencyKey: z.string().nullable(),
});

const PortAnswerSchema = z.object({
	id: z.number(),
	answer: z.unknown(),
});

const PortChangesSchema = z.object({
	invalidated: z.array(InvalidationSchema),
});

const PortGivenSchema = z.literal(PORT_GIVEN);

type PortCall = z.infer<typeof PortCallSchema>;

export interface PortListening {
	readonly headers?: Readonly<Record<string, string>>;
	readonly onAnswered?: (answer: Answer<unknown>) => void;
}

export function messagePortTransport(port: MessagePort | Promise<MessagePort>): RemoteTransport {
	return new PortCalls(port);
}

export function messagePortListener(port: MessagePort, listening: PortListening = {}): ListeningTransport {
	return {
		serve: (server: ServingServer) => {
			port.onmessage = ({ data }) => void answerPortCall(port, server, data, listening);
			const stopHearing = server.changes((invalidated) => port.postMessage({ invalidated }));
			return () => {
				stopHearing();
				port.close();
			};
		},
	};
}

export function portFromParent(here: Window = window, waitMs: number = PORT_WAIT_MS): Promise<MessagePort> {
	return new Promise((given, refused) => {
		const heard = ({ source, data, ports }: MessageEvent): void => {
			const [port] = ports;

			if (source === here.parent && PortGivenSchema.safeParse(data).success && port !== undefined) {
				settled();
				given(port);
			}
		};
		const timer = setTimeout(() => {
			settled();
			refused(new Error(NO_PORT.replace("{ms}", String(waitMs))));
		}, waitMs);
		const settled = (): void => {
			clearTimeout(timer);
			here.removeEventListener("message", heard);
		};
		here.addEventListener("message", heard);
		here.parent.postMessage(PORT_WANTED, "*");
	});
}

export function handPort(frame: Window, port: MessagePort): void {
	frame.postMessage(PORT_GIVEN, "*", [port]);
}

class PortCalls implements RemoteTransport {
	private readonly waiting = new Map<number, (answer: Answer<unknown> | null) => void>();
	private readonly heard = new ChangeBroadcast();
	private readonly opened: Promise<MessagePort>;
	private nextId = 1;

	constructor(port: MessagePort | Promise<MessagePort>) {
		this.opened = Promise.resolve(port).then((open) => {
			open.onmessage = ({ data }) => this.take(data);
			return open;
		});
	}

	async call({ request, sent, idempotencyKey }: RemoteCall): Promise<Answer<unknown>> {
		const open = await this.opened.catch((failure: unknown) => refusalOf("unreachable", reasonOf(failure)));

		if ("ok" in open) {
			return open;
		}

		const call: PortCall = { id: this.nextId++, name: request.name, input: sent, idempotencyKey };
		const notAnAnswer = refusalOf("unreachable", NOT_AN_ANSWER.replace("{name}", request.name));
		return new Promise((settle) => {
			this.waiting.set(call.id, (answered) => settle(answered ?? notAnAnswer));
			open.postMessage(call);
		});
	}

	changes(hear: HearChanges): () => void {
		return this.heard.hear(hear);
	}

	private take(data: unknown): void {
		const changes = PortChangesSchema.safeParse(data);

		if (changes.success) {
			this.heard.tell(changes.data.invalidated);
			return;
		}

		const answered = PortAnswerSchema.safeParse(data);
		const settle = answered.success ? this.waiting.get(answered.data.id) : undefined;

		if (!answered.success || settle === undefined) {
			return;
		}

		this.waiting.delete(answered.data.id);
		settle(wireAnswerOf(answered.data.answer));
	}
}

async function answerPortCall(
	port: MessagePort,
	server: ServingServer,
	data: unknown,
	listening: PortListening,
): Promise<void> {
	const call = PortCallSchema.safeParse(data);

	if (!call.success) {
		console.error(NOT_A_CALL, call.error);
		return;
	}

	const answer = await answerOf(server, call.data, listening.headers);
	listening.onAnswered?.(answer);
	port.postMessage({ id: call.data.id, answer });
}

function answerOf(
	server: ServingServer,
	{ name, input, idempotencyKey }: PortCall,
	headers: PortListening["headers"],
): Promise<Answer<unknown>> {
	const signal = new AbortController().signal;
	return server
		.answer({ name, input, idempotencyKey, signal, headers: new Headers(headers) })
		.catch((failure: unknown) => refusalOf("unreachable", reasonOf(failure), true));
}
