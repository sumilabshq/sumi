import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@widgetarium/kit";
import { usePeekHold } from "../../../../shared/lib/peek-hold.js";

export interface RowMenuItem {
	readonly label: string;
	readonly onSelect: () => void;
	readonly isDestructive?: boolean;
}

export interface RowMenuProps {
	readonly items: readonly RowMenuItem[];
	readonly children: ReactNode;
}

export function RowMenu({ items, children }: RowMenuProps): ReactElement {
	const [isOpen, setIsOpen] = useState(false);
	usePeekHold(isOpen);
	return (
		<ContextMenu onOpenChange={setIsOpen}>
			<ContextMenuTrigger className="sumi-flows-trigger">{children}</ContextMenuTrigger>
			<ContextMenuContent>
				{items.map((item) => (
					<ContextMenuItem
						key={item.label}
						variant={item.isDestructive === true ? "destructive" : "default"}
						onSelect={item.onSelect}
					>
						{item.label}
					</ContextMenuItem>
				))}
			</ContextMenuContent>
		</ContextMenu>
	);
}
