import { useOptionalQuery } from "@widgetarium/data-framework";
import { apps } from "@sumi/apps/contract";
import type { FlowTab } from "../../../shared/lib/flow-board-types.js";

const UNKNOWN_ART = "site";

export function tabLabelOf(tab: FlowTab): string {
	return tab.label ?? tab.title ?? tab.app;
}

export function useTabArt(): (tab: FlowTab) => string {
	const listed = useOptionalQuery(apps.apps.all).data;
	return (tab) => listed?.apps.find(({ id }) => id === tab.app)?.art ?? UNKNOWN_ART;
}
