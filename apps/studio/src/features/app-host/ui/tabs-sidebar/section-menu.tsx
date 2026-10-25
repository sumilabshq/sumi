import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Icon,
	IconButton,
} from "@widgetarium/kit";
import { CreateGroupCommand, SetSidebarViewCommand, TabsSidebarQuery } from "@widgetarium/app-host";
import { BOARD_ITEM, BOARD_LINE, SECTION_MENU } from "../../lib/menu-look/menu-look.js";
import { ICON_BUTTON } from "../../lib/tabs-look/tabs-look.js";

export interface SectionMenuProps {
	readonly list: string;
	readonly onGroupMade: (groupId: string) => void;
}

const VIEW_OPTIONS = "View options";
const NEW_GROUP = "New group";
const HIDE_EMPTY_LISTS = "Hide empty sections";
const HIDE_OWN_WINDOW_TABS = "Hide tabs in other windows";

export function SectionMenu({ list, onGroupMade }: SectionMenuProps): ReactElement {
	const newGroup = useCommand(CreateGroupCommand);
	const setView = useCommand(SetSidebarViewCommand);
	const { view } = useQuery(TabsSidebarQuery).data;
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
				<DropdownMenuSeparator className={BOARD_LINE} />
				<DropdownMenuCheckboxItem
					className={BOARD_ITEM}
					checked={view.hidesEmptyLists}
					onCheckedChange={(isOn) => void setView.run({ hidesEmptyLists: isOn })}
					data-tabs-hide-empty=""
				>
					<Icon name="eye-off" size={15} />
					{HIDE_EMPTY_LISTS}
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					className={BOARD_ITEM}
					checked={view.hidesOwnWindowTabs}
					onCheckedChange={(isOn) => void setView.run({ hidesOwnWindowTabs: isOn })}
					data-tabs-hide-own-window=""
				>
					<Icon name="app-window" size={15} />
					{HIDE_OWN_WINDOW_TABS}
				</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
