import { createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { GPU_FRAMES } from "@widgetarium/gpu";
import type { DrawnState } from "../../../../schemas/design.schema.js";
import type { Drawing } from "../../../../schemas/drawing.schema.js";
import type { FrameSize } from "../../../../schemas/frame-size.schema.js";
import { SCREEN } from "../../../canvas-ui/frames/screen-class.js";
import { StateDrawing } from "../../../canvas-ui/frames/state-drawing.js";
import { frameIdOf, snapshotKeyOf } from "../../lib/frame-keys.js";
import { DrawnWhenSeen } from "./drawn-when-seen.js";
import { GpuScreen } from "./gpu-screen.js";
import { ScreenBoard } from "./screen-board.js";

export interface ScreenFrameProps extends Drawing {
	readonly label: string;
	readonly state: DrawnState;
	readonly size: FrameSize;
}

interface FramePicture {
	readonly frame: string;
	readonly pictureKey: string;
}

export function ScreenFrame({ label, state, size: canvasSize, registry, host }: ScreenFrameProps): ReactElement {
	const isGpu = useContext(GPU_FRAMES) !== null;
	const size = state.size ?? canvasSize;
	const picture = framePictureOf(state, label, registry);
	const html = htmlScreenOf(state, size, picture, { registry, host });
	return (
		<div
			className="wg-design-frame cv:flex cv:flex-col cv:gap-3 cv:[contain:layout_paint]"
			data-canvas-frame={state.picture?.widget}
			style={{ width: size.width }}
		>
			<div className="cv:flex cv:min-h-9 cv:items-center cv:justify-between cv:gap-3">
				<span className="wg-design-name cv:text-lg cv:font-semibold cv:text-muted-foreground">{label}</span>
				{state.situation ? <span className="cv:text-base cv:text-muted-foreground">{state.situation}</span> : null}
			</div>
			{isGpu ? (
				<GpuScreen
					id={picture.frame}
					label={label}
					size={size}
					picture={state.picture ?? null}
					registry={registry}
					fallback={html}
				/>
			) : (
				html
			)}
		</div>
	);
}

function htmlScreenOf(state: DrawnState, size: FrameSize, picture: FramePicture, drawing: Drawing): ReactElement {
	return (
		<div className={SCREEN} style={{ minHeight: size.height }} inert data-wg-overlay-root="" data-canvas-screen="">
			<DrawnWhenSeen minHeight={size.height} {...picture}>
				{screenOf(state, size, drawing)}
			</DrawnWhenSeen>
		</div>
	);
}

function framePictureOf(state: DrawnState, label: string, registry: Drawing["registry"]): FramePicture {
	const widget = state.picture?.widget ?? state.board?.tiles[0]?.widget ?? label;
	return {
		frame: frameIdOf(widget, label),
		pictureKey: snapshotKeyOf(registry, widget, label, state.picture?.props ?? state.board),
	};
}

function screenOf(state: DrawnState, size: FrameSize, drawing: Drawing): ReactElement {
	if (state.picture) return <StateDrawing picture={state.picture} registry={drawing.registry} />;
	if (state.board) return <ScreenBoard board={state.board} width={size.width} {...drawing} />;
	return <p className="cv:m-0 cv:text-base cv:text-[var(--wg-kit-error-ink)]">{state.refusal ?? ""}</p>;
}
