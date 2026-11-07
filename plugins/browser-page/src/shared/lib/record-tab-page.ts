import { RecordAppAddressCommand } from "@sumi/contract";
import type { AppAddress } from "@sumi/contract";
import type { Runtime } from "@widgetarium/data-framework";

type AppAddressChange = Omit<AppAddress, "id">;

const RECORD_REFUSED = "[browser-page] tab {tab}: its page stays as it was ({reason})";

export function recordTabPage(shell: Runtime, tabId: string, page: AppAddressChange): void {
	void shell.send(RecordAppAddressCommand, { id: tabId, ...page }).then((answer) => {
		if (!answer.ok) {
			console.error(RECORD_REFUSED.replace("{tab}", tabId).replace("{reason}", answer.reason));
		}
	});
}
