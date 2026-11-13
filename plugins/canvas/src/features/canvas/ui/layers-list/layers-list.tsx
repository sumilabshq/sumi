import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { useQuery } from "@widgetarium/data-framework";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { BoardRow } from "../board-row/board-row.js";
import { LayerRows } from "../layer-rows/layer-rows.js";

export function LayersList(): ReactElement {
	const { tabId, pickedBoardId } = useCanvasView();
	const boards = useQuery(artboards.boards.getShownPageBoards, { tabId }).data;
	return (
		<section className="sumi-canvas-layers" aria-label="Layers">
			<div className="sumi-canvas-label">
				<span>Layers</span>
			</div>
			<div className="sumi-canvas-scroll">
				{boards.map((board) => (
					<Fragment key={board.id}>
						<BoardRow board={board} isPicked={board.id === pickedBoardId} />
						{board.id === pickedBoardId ? <LayerRows html={board.html} /> : null}
					</Fragment>
				))}
			</div>
		</section>
	);
}
