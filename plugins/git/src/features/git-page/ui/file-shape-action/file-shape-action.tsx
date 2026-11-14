import { createElement as h } from "react";
import type { ReactElement } from "react";
import { git } from "@sumi/git/contract";
import { Icon, SidePanelAction, tooltipMarks } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/data-framework";

export interface FileShapeActionProps {
	readonly isTree: boolean;
}

const AS_TREE = "Show as folders";
const AS_LIST = "Show as list";

export function FileShapeAction({ isTree }: FileShapeActionProps): ReactElement {
	const toggleTree = useCommand(git.gitLook.toggleFileTree);
	const shapeLabel = isTree ? AS_LIST : AS_TREE;
	return (
		<SidePanelAction
			aria-label={shapeLabel}
			{...tooltipMarks({ said: shapeLabel, keys: null })}
			onClick={() => void toggleTree.run()}
		>
			<Icon name={isTree ? "list" : "list-tree"} size={16} />
		</SidePanelAction>
	);
}
