import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	Icon,
	IconButton,
} from "@widgetarium/kit";
import { CreateGroupCommand } from "@widgetarium/app-host";
import { BOARD_ITEM, SECTION_MENU } from "../../lib/menu-look/menu-look.js";
import { ICON_BUTTON } from "../../lib/tabs-look/tabs-look.js";

export interface SectionMenuProps {
	readonly list: string;
	readonly onGroupMade: (groupId: string) => void;
}

const VIEW_OPTIONS = "View options";
const NEW_GROUP = "New group";

export function SectionMenu({ list, onGroupMade }: SectionMenuProps): ReactElement {
	const newGroup = useCommand(CreateGroupCommand);
	const makeGroup = async (): Promise<void> => {
		const made = await newGroup.run({ list });

		if (made.ok) {
			onGroupMade(made.output.id);
		}
	};
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<IconButton variant="ghost" label={VIEW_OPTIONS} className={ICON_BUTTON} data-tabs-view-options="">
					<Icon name="sliders-vertical" size={13} />
				</IconButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent className={SECTION_MENU} side="bottom" align="end" sideOffset={4} aria-label={VIEW_OPTIONS}>
				<DropdownMenuItem className={BOARD_ITEM} onSelect={() => void makeGroup()} data-tabs-new-group="">
					<Icon name="plus" size={15} />
					{NEW_GROUP}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
