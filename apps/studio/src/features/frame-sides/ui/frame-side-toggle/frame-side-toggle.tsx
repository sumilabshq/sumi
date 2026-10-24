import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useHoverIntent } from "@widgetarium/behaviors";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { HeaderButton } from "../../../plate/ui/plate-header/header-button.js";
import type { FrameSide } from "@widgetarium/layout";
import { FrameSidesQuery, PeekFrameSideCommand, ToggleFrameSideCommand } from "@widgetarium/layout";
import { SIDE_KEYS } from "../../lib/side-keys.js";

export interface FrameSideToggleProps {
	readonly side: FrameSide;
}

const ICON: Readonly<Record<FrameSide, string>> = {
	left: "panel-left",
	right: "panel-right",
};

interface SideLabels {
	readonly hide: string;
	readonly show: string;
}

const LABEL: Readonly<Record<FrameSide, SideLabels>> = {
	left: {
		hide: "Hide sidebar",
		show: "Show sidebar",
	},
	right: {
		hide: "Hide tabs",
		show: "Show tabs",
	},
};

export function FrameSideToggle({ side }: FrameSideToggleProps): ReactElement {
	const look = useQuery(FrameSidesQuery).data[side];
	const toggle = useCommand(ToggleFrameSideCommand);
	const peek = useCommand(PeekFrameSideCommand);
	const hover = useHoverIntent(() => void peek.run({ side }));
	return (
		<div className="wg-root wg-shell-toggle" data-side={side}>
			<HeaderButton
				label={look === "docked" ? LABEL[side].hide : LABEL[side].show}
				keys={SIDE_KEYS[side].said}
				icon={ICON[side]}
				aria-expanded={look !== "hidden"}
				data-side-toggle={side}
				onClick={() => void toggle.run({ side })}
				{...hover}
			/>
		</div>
	);
}
