import { Channel, invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import { refusalOf } from "@widgetarium/framework";
import type { Answer, ListeningTransport, ServedCall, ServingServer } from "@widgetarium/framework";
import { CORE_ANSWER, CORE_CHANGED, CORE_SERVE, CoreAskSchema } from "./core-wire.js";

export type StartWorkspace = (workspace: string, listener: ListeningTransport) => void;

const NOT_AN_ASK = "a call reached the core in a shape it does not read";
const NOT_SERVING = "[studio-core] the core could not take calls";
const NOT_ANSWERED = "[studio-core] call {id}: the answer did not reach Rust";
const NOT_TOLD = "[studio-core] workspace {workspace}: a change did not reach the windows";
const NOT_STARTED = "{name}: the core could not start workspace {workspace} ({failure})";
const FAILED = "{name}: the core failed while answering ({failure})";

const AskIdSchema = z.object({ id: z.number() });

export function serveCore(startWorkspace: StartWorkspace): void {
	const listeners = new Map<string, WorkspaceListener>();
	const listenerOf = (workspace: string): WorkspaceListener => {
		const known = listeners.get(workspace);

		if (known) {
			return known;
		}

		const started = new WorkspaceListener(workspace);
		listeners.set(workspace, started);
		try {
			startWorkspace(workspace, started);
		} catch (failure) {
			started.fail(failure);
		}

		return started;
	};
	const calls = new Channel<unknown>((message) => void answerAsk(listenerOf, message));
	invoke(CORE_SERVE, { onCall: calls }).catch((failure: unknown) => console.error(NOT_SERVING, failure));
}

class WorkspaceListener implements ListeningTransport {
	private readonly served: Promise<ServingServer>;
	private settle: {
		readonly serve: (server: ServingServer) => void;
		readonly fail: (failure: unknown) => void;
	} = {
		serve: () => undefined,
		fail: () => undefined,
	};

	constructor(private readonly workspace: string) {
		this.served = new Promise((serve, fail) => {
			this.settle = {
				serve,
				fail,
			};
		});
	}

	serve(server: ServingServer): () => void {
		this.settle.serve(server);
		return server.changes((invalidated) => {
			invoke(CORE_CHANGED, {
				workspace: this.workspace,
				invalidated,
			}).catch((failure: unknown) => console.error(NOT_TOLD.replace("{workspace}", this.workspace), failure));
		});
	}

	fail(failure: unknown): void {
		this.settle.fail(failure);
	}

	async answer(call: ServedCall): Promise<Answer<unknown>> {
		const server = await this.served.catch((failure: unknown) =>
			refusalOf(
				"unreachable",
				NOT_STARTED.replace("{name}", call.name)
					.replace("{workspace}", this.workspace)
					.replace("{failure}", String(failure)),
			),
		);

		if ("ok" in server) {
			return server;
		}

		try {
			return await server.answer(call);
		} catch (failure) {
			console.error(FAILED.replace("{name}", call.name).replace("{failure}", String(failure)), failure);
			return refusalOf("unreachable", FAILED.replace("{name}", call.name).replace("{failure}", String(failure)), true);
		}
	}
}

async function answerAsk(listenerOf: (workspace: string) => WorkspaceListener, message: unknown): Promise<void> {
	const asked = CoreAskSchema.safeParse(message);
	const id = AskIdSchema.safeParse(message);

	if (!asked.success) {
		console.error(`[studio-core] ${NOT_AN_ASK}`, asked.error);
	}

	if (!asked.success && id.success) {
		await sendAnswer(id.data.id, refusalOf("invalid-input", NOT_AN_ASK));
		return;
	}

	if (!asked.success) {
		return;
	}

	const { call } = asked.data;
	const answer = await listenerOf(call.workspace).answer({
		name: call.name,
		input: call.input,
		idempotencyKey: call.idempotencyKey,
		signal: new AbortController().signal,
		headers: new Headers(call.headers),
	});
	await sendAnswer(asked.data.id, answer);
}

async function sendAnswer(id: number, answer: Answer<unknown>): Promise<void> {
	await invoke(CORE_ANSWER, {
		id,
		answer,
	}).catch((failure: unknown) => console.error(NOT_ANSWERED.replace("{id}", String(id)), failure));
}
