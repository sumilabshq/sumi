import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { CameraQuery } from "@widgetarium/canvas";
import { GHOST_LABEL, RAISED_PILL } from "../../lib/top-bar-look.js";
import { useTopBarLook } from "../../lib/top-bar-look-context.js";
import { ZOOM_LEAVES } from "../../lib/app-zone-steps.js";

const ZOOM_TEXT = "{percent}%";
const ZOOM_SAID = "Zoom {percent}%";
const ZOOM_PILL = `${RAISED_PILL} cv:flex cv:flex-none cv:items-center cv:px-3.5 cv:text-sm cv:text-muted-foreground cv:tabular-nums ${ZOOM_LEAVES}`;
const ZOOM_GHOST = `${GHOST_LABEL} cv:flex cv:flex-none cv:items-center cv:tabular-nums ${ZOOM_LEAVES}`;

export function ZoomLabel(): ReactElement | null {
	const { camera } = useQuery(CameraQuery).data;
	const look = useTopBarLook();
	if (!camera) {
		return null;
	}

	const percent = String(Math.round(camera.scale * 100));
	return (
		<span
			className={look === "ghost" ? ZOOM_GHOST : ZOOM_PILL}
			role="status"
			aria-label={ZOOM_SAID.replace("{percent}", percent)}
			data-canvas-zoom=""
		>
			{ZOOM_TEXT.replace("{percent}", percent)}
		</span>
	);
}
