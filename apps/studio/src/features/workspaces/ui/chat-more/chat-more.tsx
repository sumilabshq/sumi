import { createElement as h, useState } from "react";
import type { MouseEvent, ReactElement } from "react";
import { HeaderButton } from "../../../plate/ui/plate-header/header-button.js";
import type { ChatRenaming } from "../../lib/chat-renaming.js";
import { useChatRow } from "../../lib/use-chat-row.js";
import { ChatMenu } from "../chat-menu/chat-menu.js";
import type { ChatMenuAt } from "../chat-menu/chat-menu.js";

const MORE_LABEL = "More";

export interface ChatMoreProps {
	readonly renaming: ChatRenaming;
	readonly chatId: string | null;
}

export function ChatMore({ renaming, chatId }: ChatMoreProps): ReactElement {
	const row = useChatRow(chatId);
	const [menuAt, setMenuAt] = useState<ChatMenuAt | null>(null);
	const openMenu = (event: MouseEvent<HTMLButtonElement>): void => {
		if (row === null) {
			return;
		}

		setMenuAt({
			id: row.id,
			under: event.currentTarget,
		});
	};
	return (
		<span>
			<HeaderButton
				label={MORE_LABEL}
				icon="ellipsis"
				aria-haspopup="menu"
				aria-expanded={menuAt !== null}
				isInert={row === null}
				onClick={openMenu}
			/>
			<ChatMenu
				at={menuAt}
				row={row?.id === menuAt?.id ? row : null}
				onClose={() => setMenuAt(null)}
				onRename={(id) => renaming.start(id, "crumb")}
			/>
		</span>
	);
}
