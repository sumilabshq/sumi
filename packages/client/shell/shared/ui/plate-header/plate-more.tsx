import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Popover, PopoverItem } from "@widgetarium/kit";
import { HeaderButton } from "./header-button.js";

export interface PlateMoreItem {
	readonly said: string;
	readonly run: () => void;
}

export interface PlateMoreProps {
	readonly items: readonly PlateMoreItem[];
}

const MORE_LABEL = "More";

export function PlateMore({ items }: PlateMoreProps): ReactElement {
	const [isOpen, setOpen] = useState(false);

	if (items.length === 0) {
		return <HeaderButton label={MORE_LABEL} icon="ellipsis" aria-haspopup="menu" />;
	}

	return (
		<Popover
			open={isOpen}
			onOpenChange={setOpen}
			placement="below"
			trigger={<HeaderButton label={MORE_LABEL} icon="ellipsis" aria-haspopup="menu" aria-expanded={isOpen} />}
		>
			<div role="menu" className="wg-plate-menu">
				{items.map((item) => (
					<PopoverItem
						key={item.said}
						role="menuitem"
						onClick={() => {
							setOpen(false);
							item.run();
						}}
					>
						{item.said}
					</PopoverItem>
				))}
			</div>
		</Popover>
	);
}
