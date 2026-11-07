import { useEffect } from "react";
import { AppPageQuery, RecordAppPageCommand } from "@sumi/contract";
import { useRuntime, useOptionalQuery } from "@widgetarium/data-framework";

const RECORD_REFUSED = "[browser-page] tab {tab}: its title stays as it was ({reason})";

export function useRecordsTitle(tabId: string, title: string): void {
	const shell = useRuntime("useRecordsTitle");
	const storedTitle = useOptionalQuery(AppPageQuery, { id: tabId }).data?.title;
	useEffect(() => {
		if (storedTitle === undefined || storedTitle === title) {
			return;
		}

		void shell.send(RecordAppPageCommand, { id: tabId, title }).then((answer) => {
			if (!answer.ok) {
				console.error(RECORD_REFUSED.replace("{tab}", tabId).replace("{reason}", answer.reason));
			}
		});
	}, [shell, tabId, title, storedTitle]);
}
