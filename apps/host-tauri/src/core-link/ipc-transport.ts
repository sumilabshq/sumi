import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { refusalOf, wireAnswerOf } from "@widgetarium/core/requests";
import type { HearChanges, RemoteTransport } from "@widgetarium/core/requests";
import { CORE_CALL, CORE_CHANGED_EVENT, CoreChangeSchema } from "./core-wire.js";
import type { CoreCall } from "./core-wire.js";

const NOT_TAKEN = "{name}: the core window did not take the call ({failure})";
const NOT_AN_ANSWER = "{name}: the core window answered something that is not an answer";

export function ipcTransport(workspace: string): RemoteTransport {
	return {
		call: async ({ request, sent, idempotencyKey }) => {
			const asked: CoreCall = {
				workspace,
				name: request.name,
				input: sent,
				idempotencyKey,
			};
			try {
				return wireAnswerOf(await invoke(CORE_CALL, asked)) ?? refusalOf("unreachable", NOT_AN_ANSWER.replace("{name}", request.name));
			} catch (failure) {
				return refusalOf("unreachable", NOT_TAKEN.replace("{name}", request.name).replace("{failure}", String(failure)));
			}
		},
		changes: (hear) => hearCoreChanges(workspace, hear),
	};
}

function hearCoreChanges(workspace: string, hear: HearChanges): () => void {
	const hearing = {
		isStopped: false,
		unlisten: (): void => undefined,
	};
	void getCurrentWebviewWindow()
		.listen(CORE_CHANGED_EVENT, (event) => {
			const change = CoreChangeSchema.safeParse(event.payload);

			if (change.success && change.data.workspace === workspace) {
				hear(change.data.invalidated);
			}
		})
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
