import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";

export interface SidebarMenuChevronProps extends HTMLAttributes<HTMLSpanElement> {
	readonly isOpen: boolean;
}

const CHEVRON_PX = 12;

export function SidebarMenuChevron({ isOpen, className, ...rest }: SidebarMenuChevronProps): ReactElement {
	return (
		<span
			aria-hidden="true"
			data-slot="sidebar-menu-chevron"
			data-state={isOpen ? "open" : "closed"}
			{...rest}
			className={cn("wg-kit-side-menu-chevron", className)}
		>
			<Icon name="chevron-down" size={CHEVRON_PX} />
		</span>
	);
}
