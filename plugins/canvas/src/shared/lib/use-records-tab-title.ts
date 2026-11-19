import { useEffect } from "react";
import { apps } from "@sumi/contract";
import { useCommand } from "@widgetarium/data-framework";

export function useRecordsTabTitle(tabId: string, title: string): void {
	const { run } = useCommand(apps.pages.record);

	useEffect(() => {
		void run({
			id: tabId,
			title,
		});
	}, [run, tabId, title]);
}
