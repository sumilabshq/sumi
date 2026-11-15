import { createElement as h } from "react";
import type { ReactNode } from "react";
import { PopoverItem } from "@widgetarium/kit";
import { useControlMenu } from "../../lib/control-menu-context.js";

export interface ControlMenuRowProps {
	readonly label: string;
	readonly keys: string | null;
	readonly icon: ReactNode;
	onRun(): void;
}

export function ControlMenuRow({ label, keys, icon, onRun }: ControlMenuRowProps): ReactNode {
	const menu = useControlMenu();
	return (
		<PopoverItem
			role="menuitem"
			className="sumi-control-menu-row"
			onClick={() => {
				menu.close();
				onRun();
			}}
		>
			<span className="sumi-control-menu-row-icon" aria-hidden="true">
				{icon}
			</span>
			<span className="sumi-control-menu-row-label">{label}</span>
			{keys === null ? null : <span className="sumi-control-menu-row-keys">{keys}</span>}
		</PopoverItem>
	);
}
