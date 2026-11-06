import { z } from "zod";
import { reasonOf, refusalOf } from "./answer";
import { forwardCommandKeysToParent } from "./frame-command-keys";
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
const NOT_SENT = "{name}: the call could not cross the port ({failure})";
const NOT_A_CALL = "[widgetarium] a call reached the port in a shape it does not read";
const NOT_READ = "[widgetarium] the port said something that is neither an answer nor a change";

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
		serve: (server: ServingServer) => new PortAnswers(port, server, listening).stop,
	};
}

export function portFromParent(here: Window = window, waitMs: number = PORT_WAIT_MS): Promise<MessagePort> {
	return new Promise((givePort, refusePort) => {
		const takeGivenPort = ({ source, data, ports }: MessageEvent): void => {
			const [port] = ports;

			if (source !== here.parent || !PortGivenSchema.safeParse(data).success || port === undefined) {
				return;
			}

			stopWaiting();
			givePort(port);
		};
		const timer = setTimeout(() => {
			stopWaiting();
			refusePort(new Error(NO_PORT.replace("{ms}", String(waitMs))));
		}, waitMs);
		const stopWaiting = (): void => {
			clearTimeout(timer);
			here.removeEventListener("message", takeGivenPort);
		};
		here.addEventListener("message", takeGivenPort);
		forwardCommandKeysToParent(here);
		here.parent.postMessage(PORT_WANTED, "*");
	});
}

export function handPort(frame: Window, port: MessagePort): void {
	frame.postMessage(PORT_GIVEN, "*", [port]);
}

class PortCalls implements RemoteTransport {
	private readonly settlersById = new Map<number, (answer: Answer<unknown> | null) => void>();
	private readonly changesHeard = new ChangeBroadcast();
	private readonly openPort: Promise<MessagePort>;
	private nextCallId = 1;

	constructor(port: MessagePort | Promise<MessagePort>) {
		this.openPort = Promise.resolve(port).then((open) => {
			open.onmessage = ({ data }) => this.receive(data);
			return open;
		});
	}

	async call({ request, sent, idempotencyKey }: RemoteCall): Promise<Answer<unknown>> {
		const open = await this.openPort.catch((failure: unknown) => refusalOf("unreachable", reasonOf(failure)));

		if ("ok" in open) {
			return open;
		}

		const call: PortCall = { id: this.nextCallId++, name: request.name, input: sent, idempotencyKey };
		return new Promise((settle) => {
			this.settlersById.set(call.id, (answered) =>
				settle(answered ?? refusalOf("unreachable", NOT_AN_ANSWER.replace("{name}", request.name))),
			);
			try {
				open.postMessage(call);
			} catch (failure) {
				this.settlersById.delete(call.id);
				settle(
					refusalOf("invalid-input", NOT_SENT.replace("{name}", request.name).replace("{failure}", reasonOf(failure))),
				);
			}
		});
	}

	changes(hear: HearChanges): () => void {
		return this.changesHeard.hear(hear);
	}

	private receive(data: unknown): void {
		const changes = PortChangesSchema.safeParse(data);

		if (changes.success) {
			this.changesHeard.tell(changes.data.invalidated);
			return;
		}

		const answered = PortAnswerSchema.safeParse(data);

		if (!answered.success) {
			console.error(NOT_READ, answered.error);
			return;
		}

		const settle = this.settlersById.get(answered.data.id);
		this.settlersById.delete(answered.data.id);
		settle?.(wireAnswerOf(answered.data.answer));
	}
}

class PortAnswers {
	private readonly stopping = new AbortController();

	constructor(
		private readonly port: MessagePort,
		private readonly server: ServingServer,
		private readonly listening: PortListening,
	) {
		port.onmessage = ({ data }) => void this.answer(data);
		const stopHearing = server.changes((invalidated) => port.postMessage({ invalidated }));
		this.stop = () => {
			stopHearing();
			this.stopping.abort();
			port.close();
		};
	}

	readonly stop: () => void;

	private async answer(data: unknown): Promise<void> {
		const call = PortCallSchema.safeParse(data);

		if (!call.success) {
			console.error(NOT_A_CALL, call.error);
			return;
		}

		const answer = await this.answerOf(call.data);
		this.listening.onAnswered?.(answer);
		this.post(call.data.id, answer);
	}

	private answerOf({ name, input, idempotencyKey }: PortCall): Promise<Answer<unknown>> {
		const { signal } = this.stopping;
		const headers = new Headers(this.listening.headers);
		return this.server
			.answer({ name, input, idempotencyKey, signal, headers })
			.catch((failure: unknown) => refusalOf("unreachable", reasonOf(failure), true));
	}

	private post(id: number, answer: Answer<unknown>): void {
		try {
			this.port.postMessage({ id, answer });
		} catch (failure) {
			this.port.postMessage({ id, answer: refusalOf("failed", reasonOf(failure), true) });
		}
	}
}
