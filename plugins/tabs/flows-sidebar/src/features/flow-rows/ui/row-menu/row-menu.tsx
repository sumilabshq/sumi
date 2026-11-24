import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@widgetarium/kit";

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
	return (
		<ContextMenu>
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
