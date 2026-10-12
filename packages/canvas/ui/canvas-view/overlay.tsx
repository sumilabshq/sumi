import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SlotList } from "@widgetarium/core";

export function Overlay({ items, at }: { readonly items: SlotList; readonly at: string }): ReactElement | null {
	if (items.length === 0) return null;
	return (
		<div className={`cv:pointer-events-none cv:absolute cv:flex ${at}`}>
			{items.map((Item) => (
				<Item key={Item.id} />
			))}
		</div>
	);
}
