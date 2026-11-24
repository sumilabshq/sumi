import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import type { OutputOf } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { navigation } from "@widgetarium/navigation/contract";
import { orderedBy } from "../../../shared/lib/tile-order.js";
import { useArrangement } from "../../../shared/lib/use-arrangement.js";

export type SetupFacts = OutputOf<typeof navigation.setups.all>["setups"][number];

const LOOSE_FLOW = {
	folderId: null,
	before: null,
};

export interface SetupTiles {
	readonly setups: readonly SetupFacts[];
	start(setupId: string): void;
	remove(setupId: string): void;
	sort(setupIds: readonly string[]): void;
}

export function useSetupTiles(): SetupTiles {
	const listed = useOptionalQuery(navigation.setups.all).data?.setups ?? [];
	const { arrangement, arrangeSetups } = useArrangement();
	const startSetup = useCommand(navigation.setups.start);
	const removeSetup = useCommand(navigation.setups.remove);
	const openFlow = useCommand(appHost.flows.open);
	const startAndOpen = async (setupId: string): Promise<void> => {
		const started = await startSetup.run({ setupId, place: LOOSE_FLOW });

		if (started.ok) {
			await openFlow.run({ flowId: started.output.flowId });
		}
	};
	return {
		setups: orderedBy(listed, ({ id }) => id, arrangement.setupIds),
		start: (setupId) => void startAndOpen(setupId),
		remove: (setupId) => void removeSetup.run({ setupId }),
		sort: arrangeSetups,
	};
}
