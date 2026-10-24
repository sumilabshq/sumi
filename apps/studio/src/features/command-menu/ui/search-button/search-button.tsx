import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { Icon, IconButton, tooltipMarks } from "@widgetarium/kit";
import { ToggleCommandMenuCommand } from "@widgetarium/command-menu";
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
			onClick={() => void openMenu.run({ door: "anywhere", text: "" })}
			{...tooltipMarks({ said: SEARCH, keys: OPEN_MENU_KEYS, side: "bottom" })}
		>
			<Icon name="search" size={iconPx} />
		</IconButton>
	);
}
