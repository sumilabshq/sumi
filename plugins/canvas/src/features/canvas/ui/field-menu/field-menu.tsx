import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@widgetarium/kit";
import { BackgroundItems } from "../background-items/background-items.js";

export interface MenuSpot {
	readonly x: number;
	readonly y: number;
}

export interface FieldMenuProps {
	readonly spot: MenuSpot | null;
	readonly onClose: () => void;
}

export function FieldMenu({ spot, onClose }: FieldMenuProps): ReactElement {
	return (
		<Popover open={spot !== null} onOpenChange={(isOpen) => isOpen || onClose()} placement="over" isPortaled>
			<PopoverAnchor
				className="sumi-canvas-menu-spot"
				style={spot === null ? undefined : { left: spot.x, top: spot.y }}
				aria-hidden="true"
			/>
			<PopoverContent>
				<BackgroundItems onChosen={onClose} />
			</PopoverContent>
		</Popover>
	);
}
