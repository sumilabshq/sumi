import { createElement as h, useState } from "react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";
import { Icon, PopoverItem, PopoverSeparator, SpotMenu } from "@widgetarium/kit";
import type { MenuSpot } from "@widgetarium/kit";
import { usePeekHold } from "../../../../shared/lib/peek-hold.js";

export interface RowMenuItem {
	readonly label: string;
	readonly icon: string;
	readonly keys?: string;
	readonly onSelect: () => void;
	readonly isDestructive?: boolean;
}

export interface RowMenuProps {
	readonly label: string;
	readonly items: readonly RowMenuItem[];
	readonly section?: (close: () => void) => ReactNode;
	readonly children: ReactNode;
}

const MENU_KEY = "ContextMenu";
const SHIFTED_MENU_KEY = "F10";

export function RowMenu({ label, items, section, children }: RowMenuProps): ReactElement {
	const [at, setAt] = useState<MenuSpot | null>(null);
	const [wasOpened, setWasOpened] = useState(false);
	usePeekHold(at !== null);
	const open = (spot: MenuSpot): void => {
		setWasOpened(true);
		setAt(spot);
	};
	return (
		<div
			className="sumi-flows-trigger"
			onContextMenu={(event) => {
				event.preventDefault();
				open({ x: event.clientX, y: event.clientY });
			}}
			onKeyDown={(event) => openOnMenuKey(event, open)}
		>
			{children}
			{wasOpened ? (
				<SpotMenu at={at} onClose={() => setAt(null)}>
					{() => <RowMenuItems label={label} items={items} section={section} onClose={() => setAt(null)} />}
				</SpotMenu>
			) : null}
		</div>
	);
}

interface RowMenuItemsProps {
	readonly label: string;
	readonly items: readonly RowMenuItem[];
	readonly section: ((close: () => void) => ReactNode) | undefined;
	readonly onClose: () => void;
}

function RowMenuItems({ label, items, section, onClose }: RowMenuItemsProps): ReactElement {
	const drawn = (item: RowMenuItem): ReactElement => (
		<PopoverItem
			key={item.label}
			role="menuitem"
			variant={item.isDestructive === true ? "destructive" : "default"}
			icon={<Icon name={item.icon} />}
			keys={item.keys}
			onClick={() => {
				onClose();
				item.onSelect();
			}}
		>
			{item.label}
		</PopoverItem>
	);
	const destructive = items.filter((item) => item.isDestructive === true);

	return (
		<div role="menu" aria-label={label}>
			{items.filter((item) => item.isDestructive !== true).map(drawn)}
			{section === undefined ? null : section(onClose)}
			{destructive.length === 0 ? null : <PopoverSeparator />}
			{destructive.map(drawn)}
		</div>
	);
}

function openOnMenuKey(event: KeyboardEvent<HTMLElement>, open: (at: MenuSpot) => void): void {
	const isMenuKey = event.key === MENU_KEY || (event.shiftKey && event.key === SHIFTED_MENU_KEY);

	if (!isMenuKey || !(event.target instanceof HTMLElement)) {
		return;
	}

	event.preventDefault();
	const box = event.target.getBoundingClientRect();
	open({ x: box.left, y: box.bottom });
}
