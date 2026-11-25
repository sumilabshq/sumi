import { createElement as h, useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from "react";
import { Icon } from "../icons/icon";
import { useDelayed } from "../hooks/use-delayed";
import { Popover } from "./popover";
import { PopoverContent } from "./popover-content";
import { PopoverItem } from "./popover-item";
import { PopoverTrigger } from "./popover-trigger";

export interface PopoverSubProps {
	readonly label: ReactNode;
	readonly icon?: ReactNode;
	readonly children: ReactNode;
}

const CHEVRON_PX = 16;
const SUB_OFFSET_PX = 4;
const FIRST_ITEM_LEVEL_PX = -8;
const LEAVE_GRACE_MS = 150;

export function PopoverSub({ label, icon, children }: PopoverSubProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	const grace = useDelayed();
	const keep = (): void => {
		grace.stop();
		setOpen(true);
	};
	const releaseSoon = (): void => grace.start(() => setOpen(false), LEAVE_GRACE_MS);
	return (
		<Popover isPortaled open={isOpen} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<PopoverItem
					role="menuitem"
					aria-haspopup="menu"
					icon={icon}
					keys={<Icon name="chevron-right" size={CHEVRON_PX} className="wg-kit-menu-chevron" />}
					onPointerEnter={keep}
					onPointerLeave={releaseSoon}
					onClick={(event: MouseEvent) => keepOpenOnPress(event, isOpen)}
					onKeyDown={(event: KeyboardEvent<HTMLElement>) => openOnForwardKey(event, isOpen)}
				>
					{label}
				</PopoverItem>
			</PopoverTrigger>
			<PopoverContent side="right" align="start" sideOffset={SUB_OFFSET_PX} alignOffset={FIRST_ITEM_LEVEL_PX} className="is-compact">
				<div role="menu" onPointerEnter={keep} onPointerLeave={releaseSoon} onKeyDown={(event) => closeOnBackKey(event, setOpen)}>
					{children}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function keepOpenOnPress(event: MouseEvent, isOpen: boolean): void {
	if (isOpen && event.detail > 0) event.preventDefault();
}

function openOnForwardKey(event: KeyboardEvent<HTMLElement>, isOpen: boolean): void {
	if (event.key !== "ArrowRight" || isOpen) return;
	event.preventDefault();
	event.currentTarget.click();
}

function closeOnBackKey(event: KeyboardEvent<HTMLElement>, setOpen: (open: boolean) => void): void {
	if (event.key !== "ArrowLeft") return;
	event.stopPropagation();
	setOpen(false);
}
