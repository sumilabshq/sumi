import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SidebarMenuAction } from "./sidebar-menu-action";
import type { SidebarMenuActionProps } from "./sidebar-menu-action";
import { SidebarMenuChevron } from "./sidebar-menu-chevron";

export interface SidebarMenuFoldProps extends Omit<SidebarMenuActionProps, "children" | "showOnHover"> {
	readonly isOpen: boolean;
}

export function SidebarMenuFold({ isOpen, ...rest }: SidebarMenuFoldProps): ReactElement {
	return (
		<SidebarMenuAction aria-expanded={isOpen} data-side-fold="" {...rest}>
			<SidebarMenuChevron isOpen={isOpen} />
		</SidebarMenuAction>
	);
}
