import { createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { StateDrawing } from "../stage/state-drawing.js";
import type { Size } from "../stage/frame-size.js";
import type { Drawing, DrawnState } from "./design-canvas-shapes.js";
import { ScreenBoard } from "./design-screen-board.js";
import { DrawnWhenSeen } from "./design-drawn-when-seen.js";
import { frameIdOf, snapshotKeyOf } from "./design-snapshots.js";
import { GpuScreen } from "./design-gpu-screen.js";
import { GPU_PAGES } from "./gpu-pages.js";

export interface ScreenFrameProps extends Drawing {
	readonly label: string;
	readonly state: DrawnState;
	readonly size: Size;
}

const SCREEN_HOLDER = { key: "screen", className: "wg-design-screen", inert: true, "data-wg-overlay-root": "" };

export function ScreenFrame({ label, state, size: canvasSize, registry, host }: ScreenFrameProps): ReactElement {
	const isGpu = useContext(GPU_PAGES) !== null;
	const size = state.size ?? canvasSize;
	const picture = framePictureOf(state, label, registry);
	const frame = {
		className: "wg-design-frame",
		"data-wg-screen": state.picture?.widget,
		style: { width: `${size.width}px` },
	};
	return h("div", frame, [
		h("div", { key: "top", className: "wg-design-top" }, [
			h("span", { key: "name", className: "wg-design-name" }, label),
			state.situation ? h("span", { key: "situation", className: "wg-design-situation" }, state.situation) : null,
		]),
		isGpu
			? h(GpuScreen, {
					key: "screen",
					id: picture.frame,
					label,
					size,
					picture: state.picture ?? null,
					registry,
					fallback: htmlScreenOf(state, size, picture, { registry, host }),
				})
			: htmlScreenOf(state, size, picture, { registry, host }),
	]);
}

function htmlScreenOf(state: DrawnState, size: Size, picture: FramePicture, drawing: Drawing): ReactElement {
	return h(
		"div",
		{ ...SCREEN_HOLDER, style: { minHeight: `${size.height}px` } },
		h(DrawnWhenSeen, { minHeight: size.height, ...picture }, screenOf(state, size, drawing)),
	);
}

interface FramePicture {
	readonly frame: string;
	readonly pictureKey: string;
}

function framePictureOf(state: DrawnState, label: string, registry: Drawing["registry"]): FramePicture {
	const widget = state.picture?.widget ?? state.board?.tiles[0]?.widget ?? label;
	return {
		frame: frameIdOf(widget, label),
		pictureKey: snapshotKeyOf(registry, widget, label, state.picture?.props ?? state.board),
	};
}

function screenOf(state: DrawnState, size: Size, drawing: Drawing): ReactElement {
	if (state.picture) return h(StateDrawing, { picture: state.picture, registry: drawing.registry });
	if (state.board) return h(ScreenBoard, { board: state.board, width: size.width, ...drawing });
	return h("p", { className: "wg-studio-ai-spec-refused" }, state.refusal ?? "");
}
