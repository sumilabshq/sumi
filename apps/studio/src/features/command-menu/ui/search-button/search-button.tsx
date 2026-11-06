import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/framework";
import { Icon, IconButton, tooltipMarks } from "@widgetarium/kit";
import { ToggleCommandMenuCommand } from "@widgetarium/command-menu";
import { MENU_DOOR_MARK } from "../../lib/menu-door-mark.js";
import { OPEN_MENU_KEYS } from "../../lib/menu-key-labels.js";

export interface SearchButtonProps {
	readonly className: string;
	readonly iconPx: number;
}

const SEARCH = "Search";

export function SearchButton({ className, iconPx }: SearchButtonProps): ReactElement {
	const openMenu = useCommand(ToggleCommandMenuCommand);
	return (
		<IconButton
			variant="ghost"
			className={className}
			label={SEARCH}
			data-cm-search=""
			{...MENU_DOOR_MARK}
			onClick={() => void openMenu.run({ door: "anywhere", text: "" })}
			{...tooltipMarks({ said: SEARCH, keys: OPEN_MENU_KEYS, side: "bottom" })}
		>
			<Icon name="search" size={iconPx} />
		</IconButton>
	);
}
