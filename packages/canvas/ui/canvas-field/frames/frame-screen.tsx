import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { DrawingQuery } from "../../../features/field/contract.js";
import type { Frame } from "../../../schema/regions.schema.js";
import { SCREEN } from "../../../lib/state-drawing/screen-class.js";
import { StateDrawing } from "../../state-drawing/state-drawing.js";
import { DrawnWhenSeen } from "./drawn-when-seen.js";
import { ScreenBoard } from "./screen-board.js";

export function FrameScreen({ frame }: { readonly frame: Frame }): ReactElement {
	const { registry, host } = useQuery(DrawingQuery).data;
	return (
		<div className={SCREEN} style={{ minHeight: frame.height }} inert data-wg-overlay-root="" data-canvas-screen="">
			<DrawnWhenSeen minHeight={frame.height} frame={frame.frame} pictureKey={frame.pictureKey}>
				{frame.picture ? <StateDrawing picture={frame.picture} registry={registry} /> : null}
				{frame.board ? <ScreenBoard board={frame.board} width={frame.width} registry={registry} host={host} /> : null}
				{frame.refusal ? (
					<p className="cv:m-0 cv:text-base cv:text-[var(--wg-kit-error-ink)]">{frame.refusal}</p>
				) : null}
			</DrawnWhenSeen>
		</div>
	);
}
