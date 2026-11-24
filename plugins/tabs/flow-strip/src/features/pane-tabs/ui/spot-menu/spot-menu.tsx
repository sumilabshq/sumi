import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@widgetarium/kit";

export interface MenuSpot {
	readonly x: number;
	readonly y: number;
}

export interface SpotMenuProps<At extends MenuSpot> {
	readonly at: At | null;
	readonly onClose: () => void;
	readonly children: (shown: At) => ReactNode;
}

export function SpotMenu<At extends MenuSpot>({ at, onClose, children }: SpotMenuProps<At>): ReactElement {
	const last = useRef<At | null>(at);

	if (at !== null) {
		last.current = at;
	}

	const shown = last.current;
	return (
		<Popover
			open={at !== null}
			onOpenChange={(isOpen) => isOpen || onClose()}
			placement="over"
			isPortaled
			className="is-compact"
		>
			{shown === null ? null : (
				<PopoverAnchor
					className="sumi-pane-menu-spot"
					style={{
						left: shown.x,
						top: shown.y,
					}}
					aria-hidden="true"
				/>
			)}
			<PopoverContent>{shown === null ? null : children(shown)}</PopoverContent>
		</Popover>
	);
}
