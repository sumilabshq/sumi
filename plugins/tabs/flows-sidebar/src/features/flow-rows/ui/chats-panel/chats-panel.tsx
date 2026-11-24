import { createElement as h, Fragment, useRef, useState } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { Popover, PopoverAnchorAt, PopoverContent } from "@widgetarium/kit";
import type { FlowChatFacts } from "../../../../shared/lib/flow-facts.js";
import { usePeekHold } from "../../../../shared/lib/peek-hold.js";
import { StatusMark } from "../../../../shared/ui/status-mark/status-mark.js";
import { useHoverIntent } from "../../lib/use-hover-intent.js";

const CHATS_PANEL_DELAYS = { openMs: 300, closeMs: 120 };
const PANEL_GAP_PX = 8;
const UNTITLED_CHAT = "Untitled chat";

export interface ChatsHoverRow {
	readonly ref?: (row: HTMLElement | null) => void;
	readonly onPointerEnter?: () => void;
	readonly onPointerLeave?: () => void;
}

export interface ChatsHoverProps {
	readonly chats: readonly FlowChatFacts[];
	readonly children: (row: ChatsHoverRow) => ReactElement;
}

const NO_HOVER: ChatsHoverRow = {};

export function ChatsHover({ chats, children }: ChatsHoverProps): ReactElement {
	const [row, setRow] = useState<HTMLElement | null>(null);
	const hover = useHoverIntent(CHATS_PANEL_DELAYS);
	const wasOpened = useRef(false);
	wasOpened.current ||= hover.isOpen;
	usePeekHold(hover.isOpen);

	if (chats.length < 2) {
		return children(NO_HOVER);
	}

	return (
		<>
			{children({ ref: setRow, onPointerEnter: hover.enter, onPointerLeave: hover.leave })}
			{wasOpened.current
				? createPortal(
						<Popover open={hover.isOpen} onOpenChange={(isOpen) => isOpen || hover.close()} isPortaled>
							<PopoverAnchorAt element={row} />
							<PopoverContent side="right" align="start" sideOffset={PANEL_GAP_PX} className="sumi-flows-chats">
								<ChatsList chats={chats} onPointerEnter={hover.enter} onPointerLeave={hover.leave} />
							</PopoverContent>
						</Popover>,
						document.body,
					)
				: null}
		</>
	);
}

interface ChatsListProps {
	readonly chats: readonly FlowChatFacts[];
	readonly onPointerEnter: () => void;
	readonly onPointerLeave: () => void;
}

function ChatsList({ chats, onPointerEnter, onPointerLeave }: ChatsListProps): ReactElement {
	return (
		<div onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
			<div className="sumi-flows-chats-head">{`${chats.length} chats`}</div>
			{chats.map((chat) => (
				<div className="sumi-flows-chats-item" key={chat.id}>
					<span className="sumi-flows-name">{chat.title ?? UNTITLED_CHAT}</span>
					<StatusMark status={chat.status} />
				</div>
			))}
		</div>
	);
}
