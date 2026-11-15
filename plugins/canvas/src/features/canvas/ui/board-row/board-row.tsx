import { createElement as h } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/data-framework";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { NamedRow } from "../named-row/named-row.js";

export interface BoardRowProps {
	readonly board: {
		readonly id: string;
		readonly name: string;
	};
	readonly isPicked: boolean;
}

export function BoardRow({ board, isPicked }: BoardRowProps): ReactElement {
	const { canvasId, pickBoard } = useCanvasView();
	const rename = useCommand(artboards.boards.renameBoard);
	const remove = useCommand(artboards.boards.removeBoard);
	return (
		<NamedRow
			name={board.name}
			isPicked={isPicked}
			depth={0}
			icon={<Icon name="hash" size={16} />}
			end={<Icon name={isPicked ? "chevron-down" : "chevron-right"} size={16} />}
			onPick={() => pickBoard(isPicked ? null : board.id)}
			onRename={(name) => void rename.run({ canvasId, board: board.id, name })}
			onDelete={() => void remove.run({ canvasId, board: board.id })}
		/>
	);
}
