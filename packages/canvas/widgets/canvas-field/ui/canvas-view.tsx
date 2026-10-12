import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import { useData } from "@widgetarium/core";
import type { PictureAsk } from "../../../schemas/frame-picture.schema.js";
import { useBatched } from "../hooks/frames/use-batched.js";
import { useSettled } from "../hooks/frames/use-settled.js";
import type { CanvasFieldPorts } from "../widget.js";
import { CanvasField } from "./canvas-field.js";
import { FRAME_PICTURES } from "./field-contexts.js";
import type { FramePicturesKit } from "./field-contexts.js";
import { Overlay } from "./overlay.js";

const JOBS_AT_MOST = 100;
const DOCS_AT_MOST = 50;

export function CanvasView({ ports }: { readonly ports: CanvasFieldPorts }): ReactElement | null {
	const design = useSettled(ports.getDesign);
	const { data: jobs } = useData(ports.getJobs, { limit: JOBS_AT_MOST });
	const { data: docs } = useData(ports.getDocs, { limit: DOCS_AT_MOST });
	const { getDrawing: drawing, getPages: pages, getViewport: viewport, getFramePictures, askForPictures } = ports;
	const ask = useBatched((asks: readonly PictureAsk[]) => void askForPictures({ asks: [...asks] }));
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
					ports={ports}
					design={design}
					drawing={drawing}
					pages={pages}
					jobs={jobs}
					docs={docs}
					viewport={viewport}
				/>
				<Overlay items={ports.start} at="cv:inset-y-0 cv:left-0 cv:z-[1]" />
				<Overlay items={ports.end} at="cv:inset-y-0 cv:right-0 cv:z-[1]" />
				<Overlay items={ports.status} at="cv:bottom-4 cv:left-1/2 cv:z-[2] cv:-translate-x-1/2" />
				<Overlay items={ports.top} at="cv:inset-x-0 cv:top-0 cv:z-[2]" />
			</div>
		</FRAME_PICTURES.Provider>
	);
}
