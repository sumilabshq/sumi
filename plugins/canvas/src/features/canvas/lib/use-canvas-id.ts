import { useEffect } from "react";
import { navigation } from "@sumi/contract";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";

export function useCanvasId(tabId: string): string | null {
	const read = useOptionalQuery(navigation.tabFacts.ownAppTab, { id: tabId });
	const { run } = useCommand(navigation.tabFacts.recordAppAddress);
	const tab = read.data?.id === tabId ? read.data : null;
	const address = tab?.address ?? null;
	const isUnaddressed = tab !== null && address === null;

	useEffect(() => {
		if (!isUnaddressed) {
			return;
		}

		void run({ id: tabId, address: tabId, how: "replace" });
	}, [isUnaddressed, run, tabId]);

	if (address !== null) {
		return address;
	}

	if (isUnaddressed || !read.isLoading) {
		return tabId;
	}

	return null;
}
