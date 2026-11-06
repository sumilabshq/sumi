import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { useTreeDrag, useTreeScroll } from "@widgetarium/behaviors";
import { LayersPanelQuery } from "@widgetarium/canvas";
import { MoveLayerCommand } from "@widgetarium/canvas";
import { DropSlot } from "./drop-slot.js";
import { LayersHeader } from "./layers-header.js";
import { LayerRow } from "./layer-row.js";
import { PANEL_ROW_INDENT_PX } from "../../lib/panel-row-look.js";
import { LiveCopy } from "./live-copy.js";

const NOT_A_PAGE = "This screen is not drawn by a page widget, so it has no layers to show.";
const LAYERS =
	"cv:flex cv:min-h-0 cv:flex-initial cv:flex-col cv:transition-[opacity,visibility] cv:duration-200 cv:ease-standard cv:motion-reduce:transition-none";
const HAIRLINE = "cv:-mx-2 cv:mt-2 cv:h-px cv:flex-none cv:bg-line";
const TREE =
	"cv:group/tree cv:relative cv:min-h-0 cv:flex-initial cv:overflow-x-hidden cv:overflow-y-auto cv:[scrollbar-width:none] cv:data-[dragging]:cursor-grabbing cv:motion-safe:animate-canvas-fade-in";

export function LayersPanel(): ReactElement | null {
	const panel = useQuery(LayersPanelQuery).data;
	const move = useCommand(MoveLayerCommand);
	const scroller = useRef<HTMLDivElement | null>(null);
	const scroll = useTreeScroll(scroller, { indent: PANEL_ROW_INDENT_PX, picked: panel.picked, isShown: panel.isShown });
	const drag = useTreeDrag(scroller, {
		indent: PANEL_ROW_INDENT_PX,
		rebuilt: panel.treeKey,
		onDrop: (drop) => void move.run(drop),
	});
	if (!panel.isDrawn) return null;
	return (
		<section
			className={`${LAYERS} ${panel.isShown ? "cv:pointer-events-auto cv:visible cv:opacity-100" : "cv:pointer-events-none cv:invisible cv:opacity-0"}`}
			aria-hidden={!panel.isShown}
			data-canvas-layers={panel.isShown ? "open" : "shut"}
		>
			<div className={HAIRLINE} role="separator" />
			<LayersHeader />
			<div key={panel.treeKey} className={TREE} ref={scroller}>
				{panel.hasPicture ? (
					panel.rows.map((row) => <LayerRow key={row.id} row={row} drag={drag} onHover={scroll.revealDepth} />)
				) : (
					<p className="cv:mx-1.5 cv:my-1 cv:text-sm cv:text-muted-foreground">{NOT_A_PAGE}</p>
				)}
				<DropSlot slot={drag.slot} />
			</div>
			<LiveCopy />
		</section>
	);
}
