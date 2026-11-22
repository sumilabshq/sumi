import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export function PopoverLabel({ className, ...rest }: HTMLAttributes<HTMLDivElement>): ReactElement {
	return <div data-slot="popover-label" {...rest} className={cn("wg-kit-menu-label", className)} />;
}
