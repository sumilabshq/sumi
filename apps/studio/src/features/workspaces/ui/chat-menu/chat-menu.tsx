import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { Icon, Popover, PopoverAnchor, PopoverAnchorAt, PopoverContent, PopoverItem } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/core/requests";
import type { ChatRowData } from "@widgetarium/workspaces";
import { PinChatCommand } from "@widgetarium/workspaces";

export type ChatMenuAt =
	| {
			readonly id: string;
			readonly x: number;
			readonly y: number;
	  }
	| {
			readonly id: string;
			readonly under: HTMLElement;
	  };

export interface ChatMenuProps {
	readonly at: ChatMenuAt | null;
	readonly row: ChatRowData | null;
	readonly onClose: () => void;
	readonly onRename: (id: string) => void;
}

const MENU_LABEL = "Chat";
const PIN = "Pin";
const UNPIN = "Unpin";
const RENAME = "Rename";
const ITEM_ICON_PX = 18;

export function ChatMenu({ at, row, onClose, onRename }: ChatMenuProps): ReactElement {
	const pinChat = useCommand(PinChatCommand);
	const lastAt = useRef(at);
	const lastRow = useRef(row);
	if (at !== null && row !== null) {
		lastAt.current = at;
		lastRow.current = row;
	}

	const spot = lastAt.current;
	const shown = lastRow.current;
	const chose = (run: () => void) => () => {
		onClose();
		run();
	};
	return (
		<Popover
			open={at !== null && row !== null}
			onOpenChange={(isOpen) => isOpen || onClose()}
			placement={spot !== null && "under" in spot ? "below" : "over"}
			isPortaled
			className="wg-ws-pop wg-ws-menu is-chat"
		>
			{spot === null || "under" in spot ? null : (
				<PopoverAnchor className="wg-ws-menu-spot" style={{ left: spot.x, top: spot.y }} aria-hidden="true" />
			)}
			<PopoverAnchorAt element={spot !== null && "under" in spot ? spot.under : null} />
			<PopoverContent>
				{shown === null ? null : (
					<div role="menu" aria-label={MENU_LABEL} data-ws-chat-menu={shown.id}>
						<PopoverItem
							role="menuitem"
							onClick={chose(() => void pinChat.run({ id: shown.id, isPinned: !shown.isPinned }))}
						>
							<Icon name="pin" size={ITEM_ICON_PX} />
							{shown.isPinned ? UNPIN : PIN}
						</PopoverItem>
						<PopoverItem role="menuitem" onClick={chose(() => onRename(shown.id))}>
							<Icon name="pencil" size={ITEM_ICON_PX} />
							{RENAME}
						</PopoverItem>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
