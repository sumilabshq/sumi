import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CanvasFieldPorts } from "../widget.js";

export function Overlay({
	items,
	at,
}: {
	readonly items: CanvasFieldPorts["top"];
	readonly at: string;
}): ReactElement | null {
	if (items.length === 0) return null;
	return (
		<div className={`cv:pointer-events-none cv:absolute cv:flex ${at}`}>
			{items.map((Item) => (
				<Item key={Item.id} />
			))}
		</div>
	);
}
