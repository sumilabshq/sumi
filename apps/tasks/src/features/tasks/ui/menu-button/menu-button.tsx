import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, DropdownMenuTrigger, Icon } from "@widgetarium/kit";

export interface MenuButtonProps {
	readonly said: string;
	readonly menu: string;
}

const CHEVRON_PX = 14;

export function MenuButton({ said, menu }: MenuButtonProps): ReactElement {
	return (
		<DropdownMenuTrigger asChild>
			<Button variant="ghost" size="s" data-tasks-menu={menu}>
				{said}
				<Icon name="chevron-down" size={CHEVRON_PX} />
			</Button>
		</DropdownMenuTrigger>
	);
}
