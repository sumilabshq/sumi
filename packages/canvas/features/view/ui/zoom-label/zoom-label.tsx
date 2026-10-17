import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { CameraQuery } from "../../contract.js";
import { RAISED_PILL } from "../../../../shared/lib/top-bar/top-bar-look.js";

const ZOOM_TEXT = "{percent}%";
const ZOOM_SAID = "Zoom {percent}%";
const ZOOM_PILL = `${RAISED_PILL} cv:flex cv:flex-none cv:items-center cv:px-3.5 cv:text-sm cv:text-muted-foreground cv:tabular-nums`;

export function ZoomLabel(): ReactElement | null {
	const { camera } = useQuery(CameraQuery).data;
	if (!camera) {
		return null;
	}

	const percent = String(Math.round(camera.scale * 100));
	return (
		<span className={ZOOM_PILL} role="status" aria-label={ZOOM_SAID.replace("{percent}", percent)} data-canvas-zoom="">
			{ZOOM_TEXT.replace("{percent}", percent)}
		</span>
	);
}
