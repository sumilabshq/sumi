import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { CanvasOrder } from "@sumi/artboards/contract";
import { Icon, Popover, PopoverContent, PopoverItem, Pressable } from "@widgetarium/kit";

export interface OrderMenuProps {
	readonly order: CanvasOrder;
	readonly onOrder: (order: CanvasOrder) => void;
}

const MENU_GAP_PX = 4;
const ICON_PX = 12;
const MENU_LABEL = "Order canvases by";
const ORDER_WORDS: Readonly<Record<CanvasOrder, string>> = {
	edited: "Last edited",
	name: "Name",
};
const ORDERS: readonly CanvasOrder[] = ["edited", "name"];

export function OrderMenu({ order, onOrder }: OrderMenuProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	return (
		<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
			<Pressable
				variant="quiet"
				tone="muted"
				aria-haspopup="menu"
				className="sumi-canvas-home-quiet"
				label={MENU_LABEL}
				aria-expanded={isOpen}
				onClick={() => setOpen(!isOpen)}
			>
				{ORDER_WORDS[order]}
				<Icon name="chevron-down" size={ICON_PX} />
			</Pressable>
			<PopoverContent side="bottom" align="end" sideOffset={MENU_GAP_PX}>
				<div role="menu" aria-label={MENU_LABEL}>
					{ORDERS.map((one) => (
						<PopoverItem
							key={one}
							role="menuitemradio"
							checked={one === order}
							onClick={() => {
								setOpen(false);
								onOrder(one);
							}}
						>
							{ORDER_WORDS[one]}
						</PopoverItem>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
