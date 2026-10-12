import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import type { PagedView, SlotList } from "@widgetarium/core";
import type { CanvasPages } from "../../schemas/canvas-page.schema.js";
import type { ReadDesign } from "../../schemas/design.schema.js";
import type { CanvasDoc } from "../../schemas/doc.schema.js";
import type { DrawingKit } from "../../schemas/drawing.schema.js";
import type { FramePictures, PictureAsk } from "../../schemas/frame-picture.schema.js";
import type { FrameSize } from "../../schemas/frame-size.schema.js";
import { SaidLine } from "../said-line/said-line.js";
import { useRefusal } from "../said-line/use-refusal.js";
import type { Act } from "../said-line/use-refusal.js";
import { useBatched } from "./hooks/frames/use-batched.js";
import { useSettled } from "./hooks/frames/use-settled.js";
import { CanvasField } from "./canvas-field.js";
import type { CanvasFieldActs } from "./canvas-field.js";
import { FRAME_PICTURES } from "./field-contexts.js";
import type { FramePicturesKit } from "./field-contexts.js";
import { Overlay } from "./overlay.js";

export interface CanvasViewProps extends CanvasFieldActs {
	readonly getDesign: ReadDesign | null;
	readonly getDrawing: DrawingKit | null;
	readonly getPages: CanvasPages | null;
	readonly getDocs: PagedView<CanvasDoc>;
	readonly getViewport: FrameSize | null;
	readonly getFramePictures: FramePictures;
	readonly askForPictures: Act<{ readonly asks: PictureAsk[] }>;
	readonly top: SlotList;
	readonly start: SlotList;
	readonly end: SlotList;
	readonly status: SlotList;
}

const SAID_AT = "cv:absolute cv:bottom-16 cv:right-4 cv:z-[2] cv:rounded-xl cv:bg-page cv:px-2.5 cv:py-1.5";

export function CanvasView(props: CanvasViewProps): ReactElement | null {
	const { getDrawing: drawing, getPages: pages, getViewport: viewport, getFramePictures, askForPictures } = props;
	const design = useSettled(props.getDesign);
	const pictured = useRefusal();
	const ask = useBatched((asks: readonly PictureAsk[]) => pictured.heard(askForPictures({ asks: [...asks] })));
	const takesPictures = drawing?.takesPictures === true;
	const pictures = useMemo<FramePicturesKit | null>(
		() => (takesPictures ? { shown: getFramePictures.shown, ask } : null),
		[takesPictures, getFramePictures, ask],
	);
	if (!design || !drawing || !pages || !viewport) return null;
	return (
		<FRAME_PICTURES.Provider value={pictures}>
			<div
				className="cv:relative cv:overflow-hidden cv:bg-page"
				style={{ width: viewport.width, height: viewport.height }}
				data-canvas-view=""
			>
				<CanvasField
					key={pages.shown}
					acts={props}
					design={design}
					drawing={drawing}
					pages={pages}
					docs={props.getDocs.items}
					viewport={viewport}
				/>
				<SaidLine said={pictured.refusal} className={SAID_AT} />
				<Overlay items={props.start} at="cv:inset-y-0 cv:left-0 cv:z-[1]" />
				<Overlay items={props.end} at="cv:inset-y-0 cv:right-0 cv:z-[1]" />
				<Overlay items={props.status} at="cv:bottom-4 cv:left-1/2 cv:z-[2] cv:-translate-x-1/2" />
				<Overlay items={props.top} at="cv:inset-x-0 cv:top-0 cv:z-[2]" />
			</div>
		</FRAME_PICTURES.Provider>
	);
}
