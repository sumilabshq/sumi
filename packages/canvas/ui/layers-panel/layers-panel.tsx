import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/mediator";
import { useTreeDrag, useTreeScroll } from "@widgetarium/behaviors";
import { LayersPanelQuery } from "../../requests/layers-panel.query.js";
import { MoveLayerCommand } from "../../requests/move-layer.command.js";
import { DropSlot } from "./drop-slot.js";
import { LayersHeader } from "./layers-header.js";
import { LayerRow, INDENT_PX } from "./layer-row.js";
import { LiveCopy } from "./live-copy.js";

const NOT_A_PAGE = "This screen is not drawn by a page widget, so it has no layers to show.";
const PANEL =
	"cv:absolute cv:inset-y-0 cv:left-0 cv:z-[1] cv:flex cv:w-[260px] cv:cursor-default cv:flex-col cv:pt-[84px] cv:pr-2 cv:pb-4 cv:pl-2.5 cv:transition-[opacity,visibility] cv:duration-200 cv:ease-standard cv:motion-reduce:transition-none cv:before:absolute cv:before:inset-0 cv:before:-z-[1] cv:before:backdrop-blur-[14px] cv:before:content-[''] cv:before:[mask-image:linear-gradient(to_right,black_70%,transparent)]";
const TREE =
	"cv:group/tree cv:relative cv:flex-1 cv:overflow-auto cv:[scrollbar-width:none] cv:data-[dragging]:cursor-grabbing cv:motion-safe:animate-canvas-fade-in";

export function LayersPanel(): ReactElement | null {
	const panel = useQuery(LayersPanelQuery).data;
	const move = useCommand(MoveLayerCommand);
	const scroller = useRef<HTMLDivElement | null>(null);
	const scroll = useTreeScroll(scroller, { indent: INDENT_PX, picked: panel.picked, isShown: panel.isShown });
	const drag = useTreeDrag(scroller, {
		indent: INDENT_PX,
		rebuilt: panel.treeKey,
		onDrop: (drop) => void move.run(drop),
	});
	if (!panel.isDrawn) return null;
	return (
		<aside
			className={`${PANEL} ${panel.isShown ? "cv:pointer-events-auto cv:visible cv:opacity-100" : "cv:pointer-events-none cv:invisible cv:opacity-0"}`}
			aria-hidden={!panel.isShown}
			data-canvas-layers={panel.isShown ? "open" : "shut"}
			data-canvas-chrome=""
		>
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
		</aside>
	);
}
