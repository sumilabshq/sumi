import { useOptionalQuery } from "@widgetarium/data-framework";
import { apps } from "@sumi/apps/contract";
import type { FlowTab } from "../../../shared/lib/flow-board-types.js";

const UNKNOWN_ART = "site";

export interface TabFaceLook {
	readonly art: string;
	readonly favicon: string | null;
}

export function tabLabelOf(tab: FlowTab): string {
	return tab.label ?? tab.title ?? tab.app;
}

export function useTabFaceOf(): (tab: FlowTab) => TabFaceLook {
	const listed = useOptionalQuery(apps.apps.all).data;
	return (tab) => {
		const app = listed?.apps.find(({ id }) => id === tab.app);
		return { art: app?.art ?? UNKNOWN_ART, favicon: app?.iconUrl ?? null };
	};
}
