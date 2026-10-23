import { createElement as h, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import type { ChatRowData } from "../../../../shared/schema/chat.schema.js";
import { RenameChatCommand } from "../../contract.js";

const TITLE_LABEL = "Chat title";

export function ChatTitleField({
	row,
	onRenamed,
}: {
	readonly row: ChatRowData;
	readonly onRenamed: () => void;
}): ReactElement {
	const [typed, setTyped] = useState(row.title);
	const renameChat = useCommand(RenameChatCommand);
	const commit = (): void => {
		if (typed.trim() !== "" && typed.trim() !== row.title) {
			void renameChat.run({ id: row.id, title: typed });
		}

		onRenamed();
	};
	const pressed = (event: KeyboardEvent<HTMLInputElement>): void => {
		if (event.key === "Enter") {
			event.preventDefault();
			commit();
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			onRenamed();
		}
	};
	return (
		<input
			className="wg-ws-row-field"
			type="text"
			value={typed}
			aria-label={TITLE_LABEL}
			autoFocus
			spellCheck={false}
			onFocus={(event) => event.currentTarget.select()}
			onInput={(event) => setTyped(event.currentTarget.value)}
			onKeyDown={pressed}
			onBlur={commit}
		/>
	);
}
