import { createElement as h } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { useCommand } from "@widgetarium/data-framework";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { NamedRow } from "../named-row/named-row.js";

export interface PageRowProps {
	readonly page: {
		readonly id: string;
		readonly name: string;
		readonly boardCount: number;
	};
	readonly isShown: boolean;
}

export function PageRow({ page, isShown }: PageRowProps): ReactElement {
	const { canvasId } = useCanvasView();
	const show = useCommand(artboards.pages.showPage);
	const rename = useCommand(artboards.pages.renamePage);
	const remove = useCommand(artboards.pages.removePage);
	return (
		<NamedRow
			name={page.name}
			isPicked={isShown}
			depth={0}
			icon={null}
			end={page.boardCount}
			onPick={() => void show.run({ canvasId, page: page.id })}
			onRename={(name) => void rename.run({ canvasId, page: page.id, name })}
			onDelete={() => void remove.run({ canvasId, page: page.id })}
		/>
	);
}
