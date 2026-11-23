import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button } from "./button";
import type { SquareButtonProps } from "./button";
import { useSidebar } from "./sidebar-context";

const TOGGLE_SIDEBAR = "Toggle Sidebar";

export function SidebarTrigger({
	onClick,
	label = TOGGLE_SIDEBAR,
	...rest
}: Omit<SquareButtonProps, "children">): ReactElement {
	const { toggleSidebar } = useSidebar();
	return (
		<Button
			data-slot="sidebar-trigger"
			shape="square"
			emphasis="ghost"
			size="sm"
			icon="panel-left"
			label={label}
			{...rest}
			onClick={(event) => {
				onClick?.(event);
				toggleSidebar();
			}}
		/>
	);
}
