import { createElement as h } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import { Ring } from "./catalogue-ring.js";
import type { FetchProgress } from "./engine/widget-source.js";
import type { PressState } from "./catalogue-install-press.js";

export interface CardActionProps {
	readonly state: PressState;
	readonly step: FetchProgress | null;
	readonly label: string;
	readonly onPress: () => unknown;
}

const ACTION_GLYPH: Readonly<Record<Exclude<PressState, "busy">, string>> = {
	add: "plus",
	install: "download",
	update: "update",
	failed: "retry",
};

const ADD_LOOK = { emphasis: "solid", tone: "brand" } as const;

const GHOST_LOOK = { emphasis: "ghost" } as const;

export function CardAction({ state, step, label, onPress }: CardActionProps): ReactElement {
	const press = (event: MouseEvent): void => {
		event.stopPropagation();
		onPress();
	};
	if (state === "busy") {
		return h(
			Button,
			{ className: "wg-cat-go is-busy", shape: "square", emphasis: "ghost", size: "sm", label, disabled: true },
			[h(Ring, { key: "ring", step }), h("span", { className: "wg-cat-stop", key: "stop" })],
		);
	}
	return h(
		Button,
		{
			className: `wg-cat-go is-${state}`,
			shape: "square",
			...(state === "add" ? ADD_LOOK : GHOST_LOOK),
			size: "sm",
			label,
			onClick: press,
		},
		h(Icon, { name: ACTION_GLYPH[state], size: 15 }),
	);
}
