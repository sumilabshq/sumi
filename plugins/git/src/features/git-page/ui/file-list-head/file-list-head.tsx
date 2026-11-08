import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ToggleFileTreeCommand } from "@sumi/git";
import { IconButton, Icon, tooltipMarks } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/data-framework";

export interface FileListHeadProps {
	readonly count: number;
	readonly viewedCount: number;
	readonly isTree: boolean;
}

const FILES = "Files";
const VIEWED = "{count} viewed";
const AS_TREE = "Show as folders";
const AS_LIST = "Show as list";

export function FileListHead({ count, viewedCount, isTree }: FileListHeadProps): ReactElement {
	const toggleTree = useCommand(ToggleFileTreeCommand);
	const shapeLabel = isTree ? AS_LIST : AS_TREE;
	return (
		<div className="wg-git-sec">
			<b>{FILES}</b>
			{count}
			<span className="wg-git-gap" />
			{viewedCount === 0 ? null : VIEWED.replace("{count}", String(viewedCount))}
			<IconButton
				variant="ghost"
				size="xs"
				label={shapeLabel}
				{...tooltipMarks({ said: shapeLabel, keys: null })}
				onClick={() => void toggleTree.run()}
			>
				<Icon name={isTree ? "list" : "list-tree"} size={14} className="wg-git-glyph" />
			</IconButton>
		</div>
	);
}
