import { useCallback } from "react";
import { AppTabQuery, RecordAppAddressCommand } from "@sumi/contract";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { addressOf, gitAddressOf } from "./git-address.js";
import type { GitAddress } from "./git-address.js";

export interface GitTab {
	readonly address: GitAddress | null;
	go(next: GitAddress): void;
}

export function useGitTab(tabId: string): GitTab {
	const tab = useOptionalQuery(AppTabQuery, { id: tabId }).data;
	const { run } = useCommand(RecordAppAddressCommand);
	const go = useCallback(
		(next: GitAddress) => void run({ id: tabId, address: addressOf(next), how: "push" }),
		[run, tabId],
	);
	return {
		address: tab === null ? null : gitAddressOf(tab.address ?? ""),
		go,
	};
}
