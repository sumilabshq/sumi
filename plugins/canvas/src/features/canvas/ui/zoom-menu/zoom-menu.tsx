import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Popover, PopoverContent, PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { percentOf, useZoom } from "../../lib/zoom-store.js";

const MENU_GAP_PX = 4;
const ZOOM_STEPS: readonly number[] = [0.5, 1, 2];
const MENU_LABEL = "Zoom";

export function ZoomMenu(): ReactElement {
	const { zoom } = useCanvasView();
	const scale = useZoom(zoom);
	const [isOpen, setOpen] = useState(false);
	const choose = (act: () => void): void => {
		setOpen(false);
		act();
	};
	return (
		<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
			<button
				type="button"
				className="sumi-canvas-top-button is-zoom"
				aria-label={MENU_LABEL}
				aria-expanded={isOpen}
				onClick={() => setOpen(!isOpen)}
			>
				{percentOf(scale)}
			</button>
			<PopoverContent side="bottom" align="end" sideOffset={MENU_GAP_PX}>
				<div role="menu" aria-label={MENU_LABEL}>
					<PopoverItem role="menuitem" onClick={() => choose(() => zoom.fit())}>
						Zoom to fit
					</PopoverItem>
					<PopoverSeparator />
					{ZOOM_STEPS.map((step) => (
						<PopoverItem
							key={step}
							role="menuitemradio"
							checked={step === scale}
							onClick={() => choose(() => zoom.zoomTo(step))}
						>
							{percentOf(step)}
						</PopoverItem>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
