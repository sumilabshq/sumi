import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { PopoverAlign, PopoverSide } from "../constants/popover";
import { cn } from "../utils/cn";
import { PopoverContent } from "./popover-content";

export interface SelectContentProps {
	readonly children?: ReactNode;
	readonly className?: string | undefined;
	readonly side?: PopoverSide | undefined;
	readonly align?: PopoverAlign | undefined;
	readonly sideOffset?: number | undefined;
}

export function SelectContent({ className: cls, children, ...placement }: SelectContentProps): ReactElement {
	return (
		<PopoverContent className={cn("wg-kit-select-content", cls)} {...placement}>
			<div role="listbox" data-slot="select-content">
				{children}
			</div>
		</PopoverContent>
	);
}
