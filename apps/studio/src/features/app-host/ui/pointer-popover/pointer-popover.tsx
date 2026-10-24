import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Popover, PopoverAnchor, PopoverContent } from "@widgetarium/kit";
import type { PointerSpot } from "../../lib/pointer-spot/pointer-spot.js";

export interface PointerPopoverProps {
	readonly spot: PointerSpot | null;
	readonly onDismiss: () => void;
	readonly className?: string;
	readonly children: ReactNode;
}

const POINT = "cv:pointer-events-none cv:fixed cv:size-0";

export function PointerPopover({ spot, onDismiss, className, children }: PointerPopoverProps): ReactElement {
	const lastSpot = useRef(spot);

	if (spot !== null) {
		lastSpot.current = spot;
	}

	const anchoredAt = lastSpot.current;
	return (
		<Popover
			open={spot !== null}
			onOpenChange={(isOpen) => {
				if (!isOpen) onDismiss();
			}}
			placement="over"
			isPortaled
			className={className}
		>
			{anchoredAt === null
				? null
				: createPortal(
						<PopoverAnchor
							aria-hidden="true"
							className={POINT}
							style={{
								left: anchoredAt.x,
								top: anchoredAt.y,
							}}
						/>,
						anchoredAt.layer,
					)}
			<PopoverContent>{children}</PopoverContent>
		</Popover>
	);
}
