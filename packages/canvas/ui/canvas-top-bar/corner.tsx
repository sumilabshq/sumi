import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SlotList } from "@widgetarium/core";
import { SlotItems } from "../slot-items/slot-items.js";

export function Corner({ items }: { readonly items: SlotList }): ReactElement | null {
	if (items.length === 0) return null;
	return (
		<div className="cv:flex cv:h-[var(--wg-studio-band,50px)] cv:items-center cv:gap-parts cv:[--wg-gap-parts:8px]">
			<SlotItems items={items} />
		</div>
	);
}
