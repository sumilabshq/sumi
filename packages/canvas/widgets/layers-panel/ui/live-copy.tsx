import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { StatePicture } from "../../../schemas/design.schema.js";
import type { Drawing } from "../../../schemas/drawing.schema.js";
import { DESKTOP_FRAME } from "../../../schemas/frame-size.schema.js";
import { LIVE_SCREEN } from "../../canvas-ui/layers/hits.js";
import { DRAWS_AT_ONCE } from "../../canvas-ui/draw-contexts.js";
import { SCREEN } from "../../canvas-ui/frames/screen-class.js";
import { StateDrawing } from "../../canvas-ui/frames/state-drawing.js";

export interface LiveCopyProps extends Pick<Drawing, "registry"> {
	readonly picture: StatePicture;
	readonly onNode: (node: HTMLDivElement | null) => void;
}

export function LiveCopy({ picture, registry, onNode }: LiveCopyProps): ReactElement {
	return (
		<div
			className="cv:pointer-events-none cv:fixed cv:top-0 cv:left-[-100000px] cv:[contain:layout_paint]"
			aria-hidden
			data-canvas-live-copy=""
		>
			<div
				className={SCREEN}
				ref={onNode}
				{...{ [LIVE_SCREEN]: picture.widget }}
				style={{ width: DESKTOP_FRAME.width }}
			>
				<DRAWS_AT_ONCE.Provider value={true}>
					<StateDrawing picture={picture} registry={registry} />
				</DRAWS_AT_ONCE.Provider>
			</div>
		</div>
	);
}
