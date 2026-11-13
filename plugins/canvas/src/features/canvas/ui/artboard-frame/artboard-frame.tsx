import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { useCommand } from "@widgetarium/data-framework";
import { useBoardDrag } from "../../lib/use-board-drag.js";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { NameField } from "../name-field/name-field.js";

export interface ArtboardFrameProps {
	readonly board: {
		readonly id: string;
		readonly name: string;
		readonly x: number;
		readonly y: number;
		readonly w: number;
		readonly h: number;
		readonly html: string;
	};
	readonly scaleNow: () => number;
}

export function ArtboardFrame({ board, scaleNow }: ArtboardFrameProps): ReactElement {
	const { tabId, pickedBoardId, pickBoard } = useCanvasView();
	const [isRenaming, setRenaming] = useState(false);
	const move = useCommand(artboards.boards.moveBoard);
	const rename = useCommand(artboards.boards.renameBoard);
	const drag = useBoardDrag(board, scaleNow, (to) => void move.run({ tabId, board: board.id, ...to }));
	const isPicked = board.id === pickedBoardId;
	return (
		<div
			className={isPicked ? "sumi-canvas-board is-picked" : "sumi-canvas-board"}
			style={{ left: drag.at.x, top: drag.at.y, width: board.w, height: board.h }}
			data-artboard={board.id}
			onPointerDown={() => pickBoard(board.id)}
		>
			{isRenaming ? (
				<NameField
					name={board.name}
					className="sumi-canvas-board-name sumi-canvas-board-field"
					onDone={(name) => {
						setRenaming(false);

						if (name !== null) {
							void rename.run({ tabId, board: board.id, name });
						}
					}}
				/>
			) : (
				<p
					className="sumi-canvas-board-name"
					data-artboard-name=""
					onPointerDown={drag.onPointerDown}
					onPointerMove={drag.onPointerMove}
					onPointerUp={drag.onPointerUp}
					onDoubleClick={() => setRenaming(true)}
				>
					{board.name}
				</p>
			)}
			<iframe className="sumi-canvas-board-page" title={board.name} sandbox="allow-scripts" srcDoc={board.html} />
		</div>
	);
}
