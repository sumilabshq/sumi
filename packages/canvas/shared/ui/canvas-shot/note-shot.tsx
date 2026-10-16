import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import type { InputOf } from "@widgetarium/core/requests";
import { DrawingQuery } from "../../../features/field/contract.js";
import { NoteBoardQuery } from "../../../features/shots/contract.js";
import { ScreenBoard } from "../canvas-field/frames/screen-board.js";

export interface NoteShotProps {
	readonly asked: InputOf<typeof NoteBoardQuery>;
}

export function NoteShot({ asked }: NoteShotProps): ReactElement {
	const { board, width } = useQuery(NoteBoardQuery, asked).data;
	const { registry, host } = useQuery(DrawingQuery).data;
	return (
		<div className="wg-portal wg-off-screen-page">
			<ScreenBoard board={board} width={width} registry={registry} host={host} />
		</div>
	);
}
