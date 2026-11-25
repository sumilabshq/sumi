import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";
import { Button } from "./button";
import type { SquareButtonProps } from "./button";

export interface SidebarMenuActionProps extends SquareButtonProps {
	readonly showOnHover?: boolean | undefined;
}

export function SidebarMenuAction({ showOnHover = false, className, ...rest }: SidebarMenuActionProps): ReactElement {
	return (
		<Button
			shape="square"
			emphasis="ghost"
			size="xs"
			data-slot="sidebar-menu-action"
			data-sort-skip=""
			{...rest}
			label={rest.label ?? ""}
			className={cn("wg-kit-side-menu-action", showOnHover && "is-on-hover", className)}
		/>
	);
}
