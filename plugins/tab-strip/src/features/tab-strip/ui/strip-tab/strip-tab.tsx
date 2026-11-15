import { createElement as h, useEffect, useRef } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent, ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { isShownItem, itemIdOf, tabOf } from "../../lib/strip-items.js";
import type { StripItem } from "../../lib/strip-items.js";
import type { TabActs } from "../../lib/use-tab-acts.js";
import type { TabDrag } from "../../lib/use-tab-drag.js";
import { TabIcons } from "./tab-icons.js";

export interface StripTabProps {
	readonly item: StripItem;
	readonly acts: TabActs;
	readonly drag: TabDrag;
	readonly isLifted: boolean;
	readonly onMenu: (item: StripItem, event: MouseEvent<HTMLElement>) => void;
	readonly onClose?: (() => void) | undefined;
}

const MIDDLE_BUTTON = 1;
const CLOSE_PX = 14;
const CLOSE_LABEL = "Close tab";
const PRESS_KEYS: ReadonlySet<string> = new Set(["Enter", " "]);

export function StripTab({ item, acts, drag, isLifted, onMenu, onClose }: StripTabProps): ReactElement {
	const isShown = isShownItem(item);
	const close = onClose ?? (() => acts.close(item));
	const element = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		if (isShown && element.current !== null) {
			bringIntoStrip(element.current);
		}
	}, [isShown]);
	const pressed = (event: PointerEvent<HTMLElement>): void => {
		if (event.button === MIDDLE_BUTTON) {
			event.preventDefault();
			return;
		}

		if (item.kind === "tab") {
			drag.press(item, event);
		}
	};
	return (
		<div
			ref={element}
			role="tab"
			tabIndex={0}
			aria-selected={isShown}
			aria-label={titleOf(item)}
			title={titleOf(item)}
			className="sumi-strip-tab"
			data-strip-item={itemIdOf(item)}
			data-own-drag=""
			data-pinned={item.isPinned ? "" : undefined}
			data-shown={isShown ? "" : undefined}
			data-lifted={isLifted ? "" : undefined}
			onPointerDown={pressed}
			onAuxClick={(event) => {
				if (event.button === MIDDLE_BUTTON) {
					close();
				}
			}}
			onClick={() => {
				if (!drag.wasDragged()) {
					acts.show(item);
				}
			}}
			onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
				if (PRESS_KEYS.has(event.key)) {
					event.preventDefault();
					acts.show(item);
				}
			}}
			onContextMenu={(event) => {
				event.preventDefault();
				onMenu(item, event);
			}}
		>
			<TabIcons item={item} />
			{item.isPinned ? null : <span className="sumi-strip-tab-title">{titleOf(item)}</span>}
			{item.isPinned ? null : (
				<button
					type="button"
					className="sumi-strip-tab-close"
					aria-label={CLOSE_LABEL}
					onPointerDown={(event) => event.stopPropagation()}
					onClick={(event) => {
						event.stopPropagation();
						close();
					}}
				>
					<Icon name="x" size={CLOSE_PX} />
				</button>
			)}
		</div>
	);
}

function bringIntoStrip(tab: HTMLElement): void {
	const strip = tab.parentElement;

	if (strip === null) {
		return;
	}

	const before = tab.offsetLeft - strip.offsetLeft - strip.scrollLeft;
	const after = before + tab.offsetWidth - strip.clientWidth;

	if (before < 0) {
		strip.scrollLeft += before;
		return;
	}

	if (after > 0) {
		strip.scrollLeft += after;
	}
}

function titleOf(item: StripItem): string {
	return tabOf(item).title;
}
