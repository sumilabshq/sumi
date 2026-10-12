import { PAGES } from "../../schema/canvas-page.js";
import { frameLabelOf } from "../../schema/design.js";
import type { DrawnScreen, DrawnState } from "../../schema/design.js";
import type { Drawing } from "../../schema/drawing.js";
import { DESKTOP_FRAME } from "../../schema/frame-size.js";
import type { Job } from "../../schema/job.js";
import type { Frame, Region } from "../../schema/regions.js";
import { frameIdOf, snapshotKeyOf } from "./frame-keys.js";

const STATES_SAID = "{count} states";

export function screensRegionOf(screens: readonly DrawnScreen[], job: Job | null, drawing: Drawing): Region {
	if (screens.length === 0 && job)
		return { kind: "planned", title: PAGES, page: job.page ?? job.title, ...DESKTOP_FRAME };
	if (screens.length === 0) return { kind: "nothing", title: PAGES };
	return {
		kind: "pages",
		title: PAGES,
		count: screens.length,
		screens: screens.map((screen) => ({
			name: screen.name,
			sub: STATES_SAID.replace("{count}", String(screen.states.length)),
			frames: screen.states.map((state) => frameOf(state, frameLabelOf(screen, state.name), drawing)),
		})),
	};
}

function frameOf(state: DrawnState, label: string, { registry }: Drawing): Frame {
	const size = state.size ?? DESKTOP_FRAME;
	const widget = state.picture?.widget ?? state.board?.tiles[0]?.widget ?? label;
	return {
		key: state.name,
		label,
		situation: state.situation ?? null,
		width: size.width,
		height: size.height,
		frame: frameIdOf(widget, label),
		pictureKey: snapshotKeyOf(registry, widget, label, state.picture?.props ?? state.board),
		widget: state.picture?.widget ?? null,
		picture: state.picture ?? null,
		isGpuDrawn: state.picture !== undefined,
		board: state.picture ? null : state.board,
		refusal: state.refusal ?? "",
	};
}
