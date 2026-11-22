import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import type { SlotPartProps } from "./create-slot-part";
import { Slot } from "./slot";

export function SidebarContent({ ref, ...props }: SlotPartProps): ReactElement {
	return h(
		props.asChild ? Slot : "div",
		{
			"data-slot": "sidebar-content",
			...domPropsOf(props),
			ref,
			className: cn("wg-kit-side-content", props.className),
		},
		props.children,
	);
}
