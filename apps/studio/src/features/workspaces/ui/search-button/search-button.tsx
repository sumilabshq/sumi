import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { Icon, IconButton, tooltipMarks } from "@widgetarium/kit";
import { MenuDoorsQuery, ToggleCommandMenuCommand } from "@sumi/command-menu";
import { OPENS_LAYER_MARK } from "@sumi/sumi-host-plugin";

export interface SearchButtonProps {
	readonly className: string;
	readonly iconPx: number;
}

const SEARCH = "Search";
const SEARCH_DOOR = "anywhere";

export function SearchButton({ className, iconPx }: SearchButtonProps): ReactElement {
	const openMenu = useCommand(ToggleCommandMenuCommand);
	const keys = useQuery(MenuDoorsQuery).data.doors.find(({ id }) => id === SEARCH_DOOR)?.keys ?? "";
	return (
		<IconButton
			variant="ghost"
			className={className}
			label={SEARCH}
			data-cm-search=""
			{...OPENS_LAYER_MARK}
			onClick={() => void openMenu.run({ door: SEARCH_DOOR, text: "" })}
			{...tooltipMarks({ said: SEARCH, keys, side: "bottom" })}
		>
			<Icon name="search" size={iconPx} />
		</IconButton>
	);
}
