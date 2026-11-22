import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Segmented } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { canvas } from "@widgetarium/canvas/contract";
import type { CanvasMode } from "@widgetarium/canvas/contract";
import { Tip } from "../tip/tip.js";

export function ModeSwitch(): ReactElement {
	const { mode } = useQuery(canvas.view.mode).data;
	const setMode = useCommand(canvas.view.setMode);
	return (
		<Segmented<CanvasMode>
			items={ITEMS}
			value={mode}
			onValueChange={(picked) => void setMode.run({ mode: picked })}
			size="s"
		/>
	);
}

const MODES: readonly { readonly value: CanvasMode; readonly icon: string; readonly said: string }[] = [
	{ value: "pointer", icon: "mouse-pointer-2", said: "Select: point at a part of a page to pick it" },
	{ value: "hand", icon: "hand", said: "Hand: drag to move around the canvas" },
];

const ITEMS = MODES.map((one) => ({
	value: one.value,
	label: (
		<Tip label={one.said}>
			<Icon name={one.icon} size={16} />
		</Tip>
	),
}));
