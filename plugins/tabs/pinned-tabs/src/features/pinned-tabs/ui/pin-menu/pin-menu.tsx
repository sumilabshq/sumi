import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { Icon, Popover, PopoverAnchor, PopoverContent, PopoverItem } from "@widgetarium/kit";
import type { PinView } from "../../lib/pin-views.js";
import type { PinActs } from "../../lib/use-pin-acts.js";

export interface PinMenuAt {
	readonly view: PinView;
	readonly x: number;
	readonly y: number;
}

export interface PinMenuProps {
	readonly at: PinMenuAt | null;
	readonly acts: PinActs;
	readonly onClose: () => void;
}

const MENU_LABEL = "Pinned tab";
const ITEM_ICON_PX = 16;

export function PinMenu({ at, acts, onClose }: PinMenuProps): ReactElement {
	const last = useRef(at);

	if (at !== null) {
		last.current = at;
	}

	const spot = last.current;
	const chose = (run: () => void) => () => {
		onClose();
		run();
	};
	return (
		<Popover
			open={at !== null}
			onOpenChange={(isOpen) => isOpen || onClose()}
			placement="over"
			isPortaled
			className="is-compact sumi-tab-menu"
		>
			{spot === null ? null : (
				<PopoverAnchor
					className="sumi-tab-menu-spot"
					style={{
						left: spot.x,
						top: spot.y,
					}}
					aria-hidden="true"
				/>
			)}
			<PopoverContent>
				{spot === null ? null : (
					<div role="menu" aria-label={MENU_LABEL} data-pin-menu={spot.view.pin.id}>
						<PopoverItem role="menuitem" onClick={chose(() => acts.unpin(spot.view.pin.id))}>
							<Icon name="pin-off" size={ITEM_ICON_PX} />
							Unpin
						</PopoverItem>
						<PopoverItem
							role="menuitem"
							disabled={spot.view.place !== "here"}
							onClick={chose(() => acts.close(spot.view.pin))}
						>
							<Icon name="x" size={ITEM_ICON_PX} />
							Close
						</PopoverItem>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
