import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ContextMenuItem, Icon } from "@widgetarium/kit";
import { POINTER_ITEM } from "../../lib/menu-look/menu-look.js";

export function PointerItem({
	icon,
	label,
	onSelect,
	isDisabled = false,
}: {
	readonly icon: string;
	readonly label: string;
	readonly onSelect: () => void;
	readonly isDisabled?: boolean;
}): ReactElement {
	return (
		<ContextMenuItem className={POINTER_ITEM} disabled={isDisabled} onSelect={onSelect} data-tabs-menu-item={label}>
			<Icon name={icon} size={16} />
			{label}
		</ContextMenuItem>
	);
}
