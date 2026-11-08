import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import type { TabRef } from "../../lib/tab-drag/tab-ref.js";
import { PointerItem } from "./pointer-item.js";

export interface AddToEssentialsItemProps {
	readonly pointed: TabRef;
	readonly at: number;
}

export function AddToEssentialsItem({ pointed, at }: AddToEssentialsItemProps): ReactElement {
	const placeTab = useCommand(appHost.tabs.place);
	return (
		<PointerItem
			icon="grid-plus"
			label="Add to Essentials"
			onSelect={() => void placeTab.run({ id: pointed.id, to: { kind: "essentials", at } })}
		/>
	);
}
