import { useLayoutEffect } from "react";
import { usePopover } from "./popover-context";

export interface PopoverAnchorAtProps {
	readonly element: HTMLElement | null;
}

export function PopoverAnchorAt({ element }: PopoverAnchorAtProps): null {
	const popover = usePopover();
	useLayoutEffect(() => {
		popover.pointRef.current = element;
	}, [popover.pointRef, element]);
	return null;
}
