import { createElement as h } from "react";
import type { ReactNode } from "react";
import { Button, PopoverTrigger, usePopover } from "@widgetarium/kit";
import { SumiFigure } from "@sumi/sumi-host-plugin";
import { CONTROL_MENU } from "../../lib/control-menu-said.js";
import { entersMenuByKey } from "../../lib/menu-entry.js";

const FIGURE_PX = 16;

export function ControlMenuTrigger(): ReactNode {
	const popover = usePopover();
	return (
		<PopoverTrigger asChild aria-haspopup="menu">
			<Button
				shape="square"
				emphasis="ghost"
				className="sumi-control-menu-button"
				label={CONTROL_MENU}
				aria-haspopup="menu"
				onKeyDown={(event) => {
					if (popover.isOpen) {
						entersMenuByKey(event, popover.panelRef.current);
					}
				}}
			>
				<SumiFigure state="rest" size={FIGURE_PX} />
			</Button>
		</PopoverTrigger>
	);
}
