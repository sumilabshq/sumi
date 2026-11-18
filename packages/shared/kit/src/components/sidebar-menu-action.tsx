import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";
import { IconButton } from "./icon-button";
import type { IconButtonProps } from "./icon-button";

export interface SidebarMenuActionProps extends IconButtonProps {
	readonly showOnHover?: boolean | undefined;
}

export function SidebarMenuAction({ showOnHover = false, className, ...rest }: SidebarMenuActionProps): ReactElement {
	return (
		<IconButton
			variant="ghost"
			size="xs"
			data-slot="sidebar-menu-action"
			data-sort-skip=""
			{...rest}
			className={cn("wg-kit-side-menu-action", showOnHover && "is-on-hover", className)}
		/>
	);
}
