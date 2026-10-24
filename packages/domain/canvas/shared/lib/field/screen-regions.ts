import { PAGES } from "../../schema/canvas-page.schema.js";
import type { DrawnScreen, DrawnState } from "../../schema/drawn-design.schema.js";
import { DESKTOP_FRAME } from "./desktop-frame.js";
import type { Job } from "../../schema/job.schema.js";
import type { Frame, Region } from "../../schema/regions.schema.js";
import { frameIdOf } from "./frame-keys.js";

const STATES_SAID = "{count} states";

export function screensRegionOf(screens: readonly DrawnScreen[], job: Job | null): Region {
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
			frames: screen.states.map((state) => frameOf(state, frameLabelOf(screen, state.name))),
		})),
	};
}

function frameOf(state: DrawnState, label: string): Frame {
	const size = state.size ?? DESKTOP_FRAME;
	const widget = state.picture?.widget ?? state.board?.tiles[0]?.widget ?? label;
	return {
		key: state.name,
		label,
		situation: state.situation ?? null,
		width: size.width,
		height: size.height,
		frame: frameIdOf(widget, label),
		widget: state.picture?.widget ?? null,
		picture: state.picture ?? null,
		refusal: state.refusal ?? "",
	};
}

function frameLabelOf(screen: DrawnScreen, state: string): string {
	return screen.states.length < 2 || state === screen.name ? screen.name : `${screen.name} · ${state}`;
}
