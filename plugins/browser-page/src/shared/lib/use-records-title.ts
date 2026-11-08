import { useEffect } from "react";
import { apps } from "@sumi/contract";
import { useRuntime, useOptionalQuery } from "@widgetarium/data-framework";

const RECORD_REFUSED = "[browser-page] tab {tab}: its title stays as it was ({reason})";

export function useRecordsTitle(tabId: string, title: string): void {
	const shell = useRuntime("useRecordsTitle");
	const storedTitle = useOptionalQuery(apps.pages.appPage, { id: tabId }).data?.title;
	useEffect(() => {
		if (storedTitle === undefined || storedTitle === title) {
			return;
		}

		void shell.send(apps.pages.recordAppPage, { id: tabId, title }).then((answer) => {
			if (!answer.ok) {
				console.error(RECORD_REFUSED.replace("{tab}", tabId).replace("{reason}", answer.reason));
			}
		});
	}, [shell, tabId, title, storedTitle]);
}
