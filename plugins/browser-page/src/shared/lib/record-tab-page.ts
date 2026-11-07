import { RecordAppPageCommand } from "@sumi/contract";
import type { AppPage } from "@sumi/contract";
import type { Runtime } from "@widgetarium/data-framework";

type AppPageChange = Omit<AppPage, "id">;

const RECORD_REFUSED = "[browser-page] tab {tab}: its page stays as it was ({reason})";

export function recordTabPage(shell: Runtime, tabId: string, page: AppPageChange): void {
	void shell.send(RecordAppPageCommand, { id: tabId, ...page }).then((answer) => {
		if (!answer.ok) {
			console.error(RECORD_REFUSED.replace("{tab}", tabId).replace("{reason}", answer.reason));
		}
	});
}
