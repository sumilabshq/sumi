import { Fragment, createElement as h, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactElement } from "react";
import { useHoverIntent } from "@widgetarium/behaviors";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { HeaderButton } from "../../../../shared/ui/plate-header/header-button.js";
import type { FrameSide } from "../../../../shared/schema/frame-sides.schema.js";
import { FrameSidesQuery, PeekFrameSideCommand, ToggleFrameSideCommand } from "../../contract.js";
import { SIDE_KEYS } from "../../lib/side-keys.js";
import { useSpotOverSide } from "../../lib/use-spot-over-side.js";

export interface SideToggleButtonProps {
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

export function SideToggleButton({ side }: SideToggleButtonProps): ReactElement {
	const look = useQuery(FrameSidesQuery).data[side];
	const toggle = useCommand(ToggleFrameSideCommand);
	const peek = useCommand(PeekFrameSideCommand);
	const hover = useHoverIntent(() => void peek.run({ side }));
	const button = useRef<HTMLButtonElement | null>(null);
	const spot = useSpotOverSide(button, look === "peeking");
	return (
		<Fragment>
			<HeaderButton
				ref={button}
				label={look === "docked" ? LABEL[side].hide : LABEL[side].show}
				keys={SIDE_KEYS[side].said}
				icon={ICON[side]}
				aria-expanded={look !== "hidden"}
				data-side-toggle={side}
				onClick={() => void toggle.run({ side })}
				{...hover}
			/>
			{spot === null
				? null
				: createPortal(
						<div
							className="wg-root wg-shell-side-pin"
							style={{
								left: spot.left,
								top: spot.top,
							}}
						>
							<HeaderButton
								label={LABEL[side].show}
								keys={SIDE_KEYS[side].said}
								icon={ICON[side]}
								data-side-pin={side}
								onClick={() => void toggle.run({ side })}
							/>
						</div>,
						spot.frame,
					)}
		</Fragment>
	);
}
