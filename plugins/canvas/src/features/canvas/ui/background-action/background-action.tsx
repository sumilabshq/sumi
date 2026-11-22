import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { useQuery } from "@widgetarium/data-framework";
import { Popover, PopoverContent, Pressable } from "@widgetarium/kit";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { BackgroundItems } from "../background-items/background-items.js";
import { BackgroundSwatch } from "../background-swatch/background-swatch.js";

const MENU_GAP_PX = 4;

export function BackgroundAction(): ReactElement {
	const { canvasId } = useCanvasView();
	const current = useQuery(artboards.canvases.getCanvas, { canvasId }).data.background;
	const [isOpen, setOpen] = useState(false);
	return (
		<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
			<Pressable
				tone="muted"
				aria-haspopup="menu"
				className="sumi-canvas-top-button is-square"
				label="Canvas background"
				aria-expanded={isOpen}
				onClick={() => setOpen(!isOpen)}
			>
				<BackgroundSwatch value={current} />
			</Pressable>
			<PopoverContent side="bottom" align="end" sideOffset={MENU_GAP_PX}>
				<BackgroundItems onChosen={() => setOpen(false)} />
			</PopoverContent>
		</Popover>
	);
}
