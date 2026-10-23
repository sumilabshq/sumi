import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Popover, PopoverAnchor, PopoverContent } from "@widgetarium/kit";
import type { MenuSpot } from "../../lib/menu-spot.js";

export interface GlassMenuProps {
	readonly spot: MenuSpot | null;
	readonly label?: string | undefined;
	readonly width: number;
	readonly onDismiss: () => void;
	readonly children: ReactNode;
}

const ABOVE_POINTER_PX = 14;
const MENU_PAD_PX = 6;

export function GlassMenu({ spot, label, width, onDismiss, children }: GlassMenuProps): ReactElement {
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
			isPortaled
		>
			{anchoredAt === null
				? null
				: createPortal(
						<PopoverAnchor
							aria-hidden="true"
							className="wg-studio-ai-menu-point"
							style={{
								left: anchoredAt.x,
								top: anchoredAt.y,
							}}
						/>,
						document.body,
					)}
			<PopoverContent side="top" align="start" sideOffset={ABOVE_POINTER_PX} className="wg-studio-ai-menu">
				<div role="menu" className="wg-studio-ai-menu-body" style={{ width: width - 2 * MENU_PAD_PX }}>
					{label === undefined ? null : <div className="wg-studio-ai-menu-label">{label}</div>}
					{children}
				</div>
			</PopoverContent>
		</Popover>
	);
}
