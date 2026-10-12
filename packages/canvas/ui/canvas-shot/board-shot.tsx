import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Board } from "@widgetarium/core/model.js";
import type { Drawing } from "../../schemas/drawing.schema.js";
import { ScreenBoard } from "../canvas-view/frames/screen-board.js";

export interface BoardShotProps extends Drawing {
	readonly board: Board;
	readonly width: number;
}

export function BoardShot({ board, width, registry, host }: BoardShotProps): ReactElement {
	return (
		<div className="wg-portal wg-off-screen-page">
			<ScreenBoard board={board} width={width} registry={registry} host={host} />
		</div>
	);
}
