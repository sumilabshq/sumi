import { createElement as h, useRef } from "react";
import { useWearsInkUnder } from "../../../plate/lib/use-wears-ink-under.js";
import type { ReactElement } from "react";
import { useHoverIntent } from "@widgetarium/behaviors";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { HeaderButton } from "../../../plate/ui/plate-header/header-button.js";
import type { FrameSide } from "@widgetarium/layout";
import { FrameSidesQuery, PeekFrameSideCommand, ToggleFrameSideCommand } from "@widgetarium/layout";
import { SIDE_KEYS } from "../../lib/side-keys.js";

export interface FrameSideToggleProps {
	readonly side: FrameSide;
}

interface SideFace {
	readonly label: string;
	readonly icon: string;
}

interface SideFaces {
	readonly docked: SideFace;
	readonly undocked: SideFace;
}

const FACES: Readonly<Record<FrameSide, SideFaces>> = {
	left: {
		docked: {
			label: "Hide sidebar",
			icon: "panel-left",
		},
		undocked: {
			label: "Show sidebar",
			icon: "panel-left",
		},
	},
};

export function FrameSideToggle({ side }: FrameSideToggleProps): ReactElement {
	const look = useQuery(FrameSidesQuery).data[side];
	const face = look === "docked" ? FACES[side].docked : FACES[side].undocked;
	const toggle = useCommand(ToggleFrameSideCommand);
	const peek = useCommand(PeekFrameSideCommand);
	const hover = useHoverIntent(() => void peek.run({ side }));
	const floating = useRef<HTMLDivElement>(null);
	useWearsInkUnder(floating);
	return (
		<div ref={floating} className="wg-root wg-shell-toggle" data-side={side}>
			<HeaderButton
				label={face.label}
				keys={SIDE_KEYS[side].said}
				icon={face.icon}
				aria-expanded={look !== "hidden"}
				data-side-toggle={side}
				onClick={() => void toggle.run({ side })}
				{...hover}
			/>
		</div>
	);
}
