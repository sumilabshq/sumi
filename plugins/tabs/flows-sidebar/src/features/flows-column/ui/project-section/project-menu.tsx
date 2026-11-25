import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, PopoverItem, PopoverSeparator, SpotMenu } from "@widgetarium/kit";
import type { MenuSpot } from "@widgetarium/kit";
import type { ProjectFacts } from "../../../../shared/lib/flow-facts.js";
import { usePeekHold } from "../../../../shared/lib/peek-hold.js";
import type { FlowActs } from "../../../../shared/lib/use-flow-acts.js";
import { RENAME_KEY } from "../../../flow-rows/lib/rename-keys.js";

const PROJECT_MENU = "Project";

export interface ProjectMenuProps {
	readonly project: ProjectFacts;
	readonly at: MenuSpot | null;
	readonly acts: FlowActs;
	readonly onRename: () => void;
	readonly onClose: () => void;
}

export function ProjectMenu({ project, at, acts, onRename, onClose }: ProjectMenuProps): ReactElement {
	usePeekHold(at !== null);
	const pick = (act: () => void): void => {
		onClose();
		act();
	};
	return (
		<SpotMenu at={at} onClose={onClose}>
			{() => (
				<div role="menu" aria-label={PROJECT_MENU}>
					<PopoverItem
						role="menuitem"
						icon={<Icon name="pencil-line" />}
						keys={RENAME_KEY}
						onClick={() => pick(onRename)}
					>
						Rename
					</PopoverItem>
					<PopoverItem
						role="menuitem"
						icon={<Icon name="folder-open" />}
						sub={project.baseFolder}
						onClick={() => pick(() => acts.pickBaseFolder(project.id))}
					>
						Base folder
					</PopoverItem>
					{project.isGeneral ? null : <PopoverSeparator />}
					{project.isGeneral ? null : (
						<PopoverItem
							role="menuitem"
							variant="destructive"
							icon={<Icon name="trash" />}
							onClick={() => pick(() => acts.removeProject(project.id))}
						>
							Delete project
						</PopoverItem>
					)}
				</div>
			)}
		</SpotMenu>
	);
}
