import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, PopoverItem } from "@widgetarium/kit";
import type { AppTabState } from "@widgetarium/app-host/contract";
import { usePinActs } from "../../lib/use-pin-acts.js";
import { usePins } from "../../lib/use-pins.js";

export interface PinMenuItemProps {
	readonly tab: AppTabState;
	readonly onDone: () => void;
}

const ITEM_ICON_PX = 16;

export function PinMenuItem({ tab, onDone }: PinMenuItemProps): ReactElement {
	const acts = usePinActs();
	const isPinned = usePins().some(({ id }) => id === tab.id);

	return (
		<PopoverItem
			role="menuitem"
			onClick={() => {
				onDone();

				if (isPinned) {
					acts.unpin(tab.id);
					return;
				}

				acts.pin(tab);
			}}
		>
			<Icon name={isPinned ? "pin-off" : "pin"} size={ITEM_ICON_PX} />
			{isPinned ? "Unpin" : "Pin"}
		</PopoverItem>
	);
}
