import { useCallback } from "react";
import { navigation } from "@sumi/contract";
import { useCommand } from "@widgetarium/data-framework";

export type OpenLink = (href: string, inNewTab: boolean) => void;

export function useOpensLink(tabId: string): OpenLink {
	const { run } = useCommand(navigation.tabFacts.openLink);
	return useCallback(
		(href, inNewTab) => {
			void run({
				from: tabId,
				href,
				inNewTab,
			});
		},
		[run, tabId],
	);
}
