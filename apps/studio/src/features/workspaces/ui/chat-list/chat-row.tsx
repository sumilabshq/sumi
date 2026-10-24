import { createElement as h, memo, useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/core/requests";
import type { ChatRowData } from "@widgetarium/workspaces";
import { SelectChatCommand } from "@widgetarium/workspaces";
import { useCarriesChat } from "../../lib/use-carries-chat.js";
import type { ChatMenuAt } from "../chat-menu/chat-menu.js";
import { ChatMark } from "./chat-mark.js";
import { ChatTitleField } from "./chat-title-field.js";

export interface ChatRowProps {
	readonly row: ChatRowData;
	readonly isRenaming: boolean;
	readonly onMenu: (at: ChatMenuAt) => void;
	readonly onRenamed: () => void;
}

const MORE = "More for {title}";
const MORE_ICON_PX = 16;

export const ChatRow = memo(function ChatRow({ row, isRenaming, onMenu, onRenamed }: ChatRowProps): ReactElement {
	const selectChat = useCommand(SelectChatCommand);
	const select = useCallback(() => void selectChat.run({ id: row.id }), [selectChat, row.id]);
	const carry = useCarriesChat(
		{
			id: row.id,
			title: row.title,
		},
		select,
	);
	const menuAt = (event: MouseEvent): void => {
		event.preventDefault();
		onMenu({ id: row.id, x: event.clientX, y: event.clientY });
	};
	return (
		<div
			className={`wg-ws-row${row.isActive ? " is-active" : ""}`}
			onContextMenu={menuAt}
			onPointerDown={carry}
			data-ws-chat={row.id}
			data-ws-mark={row.mark}
		>
			{isRenaming ? (
				<ChatTitleField row={row} onRenamed={onRenamed} />
			) : (
				<button
					type="button"
					className="wg-ws-row-pick"
					aria-current={row.isActive ? "true" : undefined}
					onClick={select}
				>
					<span className="wg-ws-row-title">{row.title}</span>
				</button>
			)}
			<ChatMark mark={row.mark} />
			<IconButton
				variant="ghost"
				className="wg-ws-row-more"
				label={MORE.replace("{title}", row.title)}
				aria-haspopup="menu"
				onClick={menuAt}
			>
				<Icon name="ellipsis" size={MORE_ICON_PX} />
			</IconButton>
		</div>
	);
});
