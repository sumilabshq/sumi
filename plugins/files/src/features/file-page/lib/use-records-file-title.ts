import { useEffect } from "react";
import { RecordAppPageCommand } from "@sumi/contract";
import { useRuntime } from "@widgetarium/data-framework";

const NOT_RECORDED = "[files] tab {tab} keeps its title: {reason}";

export function useRecordsFileTitle(tabId: string, path: string): void {
	const shell = useRuntime("useRecordsFileTitle");
	useEffect(() => {
		const title = path.slice(path.lastIndexOf("/") + 1);
		// TODO: drop actions: [] once no kept tab holds actions the viewers recorded before drawing their own
		void shell.send(RecordAppPageCommand, { id: tabId, title, actions: [] }).then((answer) => {
			if (!answer.ok) {
				console.warn(NOT_RECORDED.replace("{tab}", tabId).replace("{reason}", answer.reason));
			}
		});
	}, [shell, tabId, path]);
}
