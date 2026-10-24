import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Popover, PopoverAnchorAt, PopoverContent } from "@widgetarium/kit";
import { BOARD_LABEL, BOARD_LINE, GROUP_MENU } from "../../lib/menu-look/menu-look.js";
import type { GroupState } from "@widgetarium/app-host";
import { GroupActions } from "./group-actions.js";
import { GroupHues } from "./group-hues.js";
import { GroupNameField } from "./group-name-field.js";

export interface GroupMenuProps {
	readonly group: GroupState | null;
	readonly anchor: HTMLElement | null;
	readonly onClose: () => void;
}

const GROUP_SAID = "Group {name}";
const COLOUR = "Colour";
const BELOW_PX = 4;

export function GroupMenu({ group, anchor, onClose }: GroupMenuProps): ReactElement {
	return (
		<Popover
			open={group !== null && anchor !== null}
			onOpenChange={(isOpen) => {
				if (!isOpen) {
					onClose();
				}
			}}
			isPortaled
		>
			<PopoverAnchorAt element={anchor} />
			<PopoverContent className={GROUP_MENU} side="bottom" align="start" sideOffset={BELOW_PX}>
				{group === null ? null : (
					<div
						role="group"
						className="cv:flex cv:flex-col"
						aria-label={GROUP_SAID.replace("{name}", group.name)}
						data-tabs-group-menu={group.id}
					>
						<GroupNameField group={group} onDone={onClose} />
						<div className={BOARD_LABEL}>{COLOUR}</div>
						<GroupHues group={group} />
						<div className={BOARD_LINE} />
						<GroupActions group={group} onClose={onClose} />
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
