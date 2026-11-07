import { useEffect } from "react";
import { RecordAppAddressCommand } from "@sumi/contract";
import { useRuntime } from "@widgetarium/data-framework";

const NOT_RECORDED = "[files] tab {tab} keeps its title: {reason}";

export function useRecordsFileTitle(tabId: string, path: string): void {
	const shell = useRuntime("useRecordsFileTitle");
	useEffect(() => {
		const title = path.slice(path.lastIndexOf("/") + 1);
		void shell.send(RecordAppAddressCommand, { id: tabId, title }).then((answer) => {
			if (!answer.ok) {
				console.warn(NOT_RECORDED.replace("{tab}", tabId).replace("{reason}", answer.reason));
			}
		});
	}, [shell, tabId, path]);
}
