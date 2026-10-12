import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { InjectProps } from "@widgetarium/core";
import type { Drawing } from "../../schemas/drawing.schema.js";
import { DESKTOP_FRAME } from "../../schemas/frame-size.schema.js";
import type { Shot } from "../../schemas/shot.schema.js";
import type { canvasShotInject } from "../../widgets/canvas-shot.widget.js";
import { PagesRegion } from "../canvas-view/regions/pages-region.js";
import { ReferencesRegion, widgetOpenerOf } from "../canvas-view/regions/references-region.js";
import { WidgetsRegion } from "../canvas-view/regions/widgets-region.js";
import { DRAWS_AT_ONCE } from "../state-drawing/draw-contexts.js";
import { BoardShot } from "./board-shot.js";

type RegionShot = Exclude<Shot, { readonly kind: "board" }>;

export function CanvasShot({
	shotQuery: { data: shot },
	drawingQuery: { data: drawing },
}: InjectProps<typeof canvasShotInject>): ReactElement | null {
	if (!shot || !drawing) return null;
	if (shot.kind === "board")
		return <BoardShot board={shot.board} width={shot.width} registry={drawing.registry} host={drawing.host} />;
	return (
		<DRAWS_AT_ONCE.Provider value={true}>
			<div className="wg-design-field wg-portal">{regionOf(shot, drawing)}</div>
		</DRAWS_AT_ONCE.Provider>
	);
}

function regionOf(shot: RegionShot, { registry, host }: Drawing): ReactElement | null {
	if (shot.kind === "pages")
		return <PagesRegion screens={shot.screens} size={DESKTOP_FRAME} registry={registry} host={host} />;
	if (shot.kind === "references")
		return <ReferencesRegion references={shot.references} opener={widgetOpenerOf(registry, () => undefined)} />;
	return <WidgetsRegion widgets={shot.widgets} registry={registry} host={host} />;
}
