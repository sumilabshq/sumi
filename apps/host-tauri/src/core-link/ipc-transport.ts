import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Repeatable, refusalOf, wireAnswerOf } from "@widgetarium/core/requests";
import type { Answer, HearChanges, RemoteTransport } from "@widgetarium/core/requests";
import { PlacesModule } from "@widgetarium/places";
import { TasksModule } from "@widgetarium/tasks";
import { FileSystemModule } from "@widgetarium/file-system";
import { TerminalModule } from "@widgetarium/terminal";
import { CORE_CALL, CORE_CHANGED_EVENT, CORE_RESTARTED, CORE_SERVING_EVENT, CoreChangeSchema } from "./core-wire.js";
import type { CoreCall } from "./core-wire.js";

type CoreAsk = Parameters<RemoteTransport["call"]>[0];

const NOT_TAKEN = "{name}: the core window did not take the call ({failure})";
const NOT_AN_ANSWER = "{name}: the core window answered something that is not an answer";
const ASKED_AGAIN = "[widgetarium] {name}: the core window restarted before it answered → asked again";

export function ipcTransport(workspace: string): RemoteTransport {
	return {
		call: async (ask) => {
			const answer = await askCore(workspace, ask);

			if (!isLostToRestart(answer) || !isSafeToRepeat(ask)) {
				return answer;
			}

			console.info(ASKED_AGAIN.replace("{name}", ask.request.name));
			return askCore(workspace, ask);
		},
		changes: (hear) => hearCoreChanges(workspace, hear),
	};
}

async function askCore(
	workspace: string,
	{ request, sent, idempotencyKey, headers }: CoreAsk,
): Promise<Answer<unknown>> {
	const asked: CoreCall = {
		workspace,
		name: request.name,
		input: sent,
		idempotencyKey,
		headers: Object.fromEntries(headers ?? []),
	};
	try {
		return (
			wireAnswerOf(await invoke(CORE_CALL, asked)) ??
			refusalOf("unreachable", NOT_AN_ANSWER.replace("{name}", request.name))
		);
	} catch (failure) {
		return refusalOf("unreachable", NOT_TAKEN.replace("{name}", request.name).replace("{failure}", String(failure)));
	}
}

function isLostToRestart(answer: Answer<unknown>): boolean {
	return !answer.ok && answer.code === "unreachable" && answer.reason === CORE_RESTARTED;
}

function isSafeToRepeat({ request, idempotencyKey }: CoreAsk): boolean {
	return request.kind === "query" || idempotencyKey !== null || request.keyPolicy === Repeatable;
}

function hearCoreChanges(workspace: string, hear: HearChanges): () => void {
	const stopChanged = listenOnWindow(CORE_CHANGED_EVENT, (payload) => {
		const change = CoreChangeSchema.safeParse(payload);

		if (change.success && change.data.workspace === workspace) {
			hear(change.data.invalidated);
		}
	});
	const stopServing = listenOnWindow(CORE_SERVING_EVENT, () => {
		console.info(
			`[widgetarium] core serving again → workspace ${workspace} re-reads every places, tasks, file-system and terminal query`,
		);
		hear(EVERY_CORE_QUERY);
	});
	return () => {
		stopChanged();
		stopServing();
	};
}

function listenOnWindow(name: string, heard: (payload: unknown) => void): () => void {
	const hearing = {
		isStopped: false,
		unlisten: (): void => undefined,
	};
	void getCurrentWebviewWindow()
		.listen(name, (event) => heard(event.payload))
		.then((unlisten) => {
			if (hearing.isStopped) {
				unlisten();
				return;
			}

			hearing.unlisten = unlisten;
		});
	return () => {
		hearing.isStopped = true;
		hearing.unlisten();
	};
}

const EVERY_CORE_QUERY: Parameters<HearChanges>[0] = [
	...PlacesModule.requests,
	...TasksModule.requests,
	...FileSystemModule.requests,
	...TerminalModule.requests,
]
	.filter((request) => request.kind === "query")
	.map((request) => ({
		query: request.name,
		inputKey: null,
	}));
