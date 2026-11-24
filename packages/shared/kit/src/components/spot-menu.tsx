import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn";
import { portalLayer } from "../utils/portal-layer";
import { Popover } from "./popover";
import { PopoverAnchor } from "./popover-anchor";
import { PopoverContent } from "./popover-content";

export interface MenuSpot {
	readonly x: number;
	readonly y: number;
}

export interface SpotMenuProps<At extends MenuSpot> {
	readonly at: At | null;
	readonly className?: string | undefined;
	readonly onClose: () => void;
	readonly children: (shown: At) => ReactNode;
}

export function SpotMenu<At extends MenuSpot>({ at, className, onClose, children }: SpotMenuProps<At>): ReactElement {
	const last = useRef<At | null>(at);

	if (at !== null) {
		last.current = at;
	}

	const shown = last.current;
	return createPortal(
		<Popover
			open={at !== null}
			onOpenChange={(isOpen) => isOpen || onClose()}
			placement="over"
			isPortaled
			className={cn("is-compact", className)}
		>
			{shown === null ? null : (
				<PopoverAnchor className="wg-kit-pop-spot" style={{ left: shown.x, top: shown.y }} aria-hidden="true" />
			)}
			<PopoverContent>{shown === null ? null : children(shown)}</PopoverContent>
		</Popover>,
		portalLayer(),
	);
}
