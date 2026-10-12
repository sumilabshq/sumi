import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import type { SlotList } from "@widgetarium/core";

export function SlotItems({ items }: { readonly items: SlotList }): ReactElement {
	return (
		<>
			{items.map((Item) => (
				<Item key={Item.id} />
			))}
		</>
	);
}
