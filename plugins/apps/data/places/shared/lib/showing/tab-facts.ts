import type { PageFacts, Screen } from "../../schema/screen.schema.js";

export interface TabPane {
	readonly paneId: string;
	readonly tabId: string;
}

export interface TabFacts {
	readonly pages: readonly PageFacts[];
	readonly isBrowserAvailable: boolean;
	readonly canOpenOwnWindow: boolean;
	readonly tabPanes: readonly TabPane[];
	readonly shownTabPaneId: string | null;
	readonly hasTabTarget: boolean;
	readonly tabTargetId: string | null;
	readonly chatGroupIds: readonly string[];
	readonly tabWindows: ReadonlyMap<string, string>;
}

export function tabFactsOf(screen: Screen): TabFacts {
	return {
		pages: screen.pages,
		isBrowserAvailable: screen.isBrowserAvailable,
		canOpenOwnWindow: screen.canOpenOwnWindow,
		tabPanes: screen.tabPanes,
		shownTabPaneId: screen.shownTabPaneId,
		hasTabTarget: screen.tabTargetId !== null,
		tabTargetId: screen.tabTargetId,
		chatGroupIds: screen.chatGroups.map((group) => group.chatId),
		tabWindows: tabWindowsIn(screen),
	};
}

export function tabIdsInPanesOf(facts: TabFacts): readonly string[] {
	return facts.tabPanes.map(({ tabId }) => tabId);
}

function tabWindowsIn({ elsewhere }: Screen): ReadonlyMap<string, string> {
	return new Map(elsewhere.flatMap(({ window, tabIds }) => tabIds.map((id) => [id, window] as const)));
}
