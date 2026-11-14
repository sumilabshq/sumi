import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { useQuery } from "@widgetarium/data-framework";
import { Popover, PopoverContent } from "@widgetarium/kit";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { BackgroundItems } from "../background-items/background-items.js";
import { BackgroundSwatch } from "../background-swatch/background-swatch.js";

const MENU_GAP_PX = 4;

export function BackgroundAction(): ReactElement {
	const { tabId } = useCanvasView();
	const current = useQuery(artboards.canvases.getCanvas, { tabId }).data.background;
	const [isOpen, setOpen] = useState(false);
	return (
		<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
			<button
				type="button"
				className="sumi-canvas-background"
				aria-label="Canvas background"
				aria-expanded={isOpen}
				onClick={() => setOpen(!isOpen)}
			>
				<BackgroundSwatch value={current} />
			</button>
			<PopoverContent side="bottom" align="end" sideOffset={MENU_GAP_PX}>
				<BackgroundItems onChosen={() => setOpen(false)} />
			</PopoverContent>
		</Popover>
	);
}
