import { useEffect } from "react";
import { AppTabQuery } from "@sumi/contract";
import { useRuntime, useOptionalQuery } from "@widgetarium/data-framework";
import { recordTabPage } from "./record-tab-page.js";

export function useRecordsTitle(tabId: string, title: string): void {
	const shell = useRuntime("useRecordsTitle");
	const read = useOptionalQuery(AppTabQuery, { id: tabId });
	const storedTitle = read.data?.title;
	useEffect(() => {
		if (storedTitle === undefined || storedTitle === title) {
			return;
		}

		recordTabPage(shell, tabId, { title });
	}, [shell, tabId, title, storedTitle]);
}
