import { appHost } from "@widgetarium/app-host/contract";
import type { PaneBoard } from "@widgetarium/app-host/contract";
import type { Runtime } from "@widgetarium/data-framework";
import type { LogContext } from "./studio-log.js";

let heldContext: LogContext = {};

export function studioLogContext(): LogContext {
	return heldContext;
}

export function followStudioLogContext(studioApp: Runtime, workspace: string): void {
	heldContext = { workspace };
	let lastAsked = 0;
	const reread = async (): Promise<void> => {
		lastAsked += 1;
		const asked = lastAsked;
		const answered = await studioApp.send(appHost.panes.paneTree);

		if (!answered.ok || asked !== lastAsked) {
			return;
		}

		heldContext = {
			workspace,
			...shownOf(answered.output),
		};
	};
	void reread();
	studioApp.routes.watch(appHost.panes.paneTree, undefined, () => {
		void reread();
	});
}

function shownOf(board: PaneBoard): LogContext {
	const tab = board.tabPanes.find((pane) => pane.paneId === board.tabTargetId)?.tabId;
	const chat = board.focusedChatId ?? undefined;
	return {
		...(tab === undefined ? {} : { tab }),
		...(chat === undefined ? {} : { chat }),
	};
}
