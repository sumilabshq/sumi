import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { homeLayout } from "@sumi/home-layout/contract";
import type { AppTile, Arrangement } from "@sumi/home-layout/contract";

const UNARRANGED: Arrangement = {
	setupIds: [],
	apps: [],
	hiddenApps: [],
};

export interface ArrangementActs {
	readonly arrangement: Arrangement;
	arrangeSetups(setupIds: readonly string[]): void;
	arrangeApps(apps: readonly AppTile[], hiddenApps: readonly string[]): void;
}

export function useArrangement(): ArrangementActs {
	const arrangement = useOptionalQuery(homeLayout.arrangement.all).data ?? UNARRANGED;
	const arrangeSetups = useCommand(homeLayout.arrangement.arrangeSetups);
	const arrangeApps = useCommand(homeLayout.arrangement.arrangeApps);
	return {
		arrangement,
		arrangeSetups: (setupIds) => void arrangeSetups.run({ setupIds: [...setupIds] }),
		arrangeApps: (apps, hiddenApps) => void arrangeApps.run({ apps: [...apps], hiddenApps: [...hiddenApps] }),
	};
}
