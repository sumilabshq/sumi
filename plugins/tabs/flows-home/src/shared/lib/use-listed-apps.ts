import { useOptionalQuery } from "@widgetarium/data-framework";
import { apps } from "@sumi/apps/contract";
import type { AppFace } from "@sumi/apps/contract";

export const UNKNOWN_ART = "site";

export interface ListedApps {
	readonly listed: readonly AppFace[];
	artOf(appId: string): string;
}

export function useListedApps(): ListedApps {
	const all = useOptionalQuery(apps.apps.all).data?.apps ?? [];
	return {
		listed: all.filter(({ isListed }) => isListed),
		artOf: (appId) => all.find(({ id }) => id === appId)?.art ?? UNKNOWN_ART,
	};
}
