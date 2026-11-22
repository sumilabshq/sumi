import { createElement as h } from "react";
import type { Key, ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import type { SegmentedItem } from "@widgetarium/kit";
import { GHOST_HEIGHT } from "../../lib/top-bar-look.js";
import { useTopBarLook } from "../../lib/top-bar-look-context.js";

export interface PillSwitchProps<V extends Key> {
	readonly items: readonly SegmentedItem<V>[];
	readonly value: V;
	readonly onValueChange: (value: V) => void;
}

const PILL_SWITCH = "cv:flex-none cv:items-center";

const GHOST_SWITCH = `${GHOST_HEIGHT} cv:flex-none cv:items-center`;

export function PillSwitch<V extends Key>({ items, value, onValueChange }: PillSwitchProps<V>): ReactElement {
	const look = useTopBarLook();
	return (
		<Segmented<V>
			items={items}
			value={value}
			onValueChange={onValueChange}
			className={look === "ghost" ? GHOST_SWITCH : PILL_SWITCH}
		/>
	);
}
