import { createElement as h } from "react";
import type { ReactElement } from "react";
import { TabRenameField } from "../../../app-host/ui/rename-field/tab-rename-field.js";
import type { ChatRenaming } from "../../lib/chat-renaming.js";

export interface RenamingCrumbProps {
	readonly chat: { readonly id: string; readonly title: string };
	readonly renaming: ChatRenaming;
}

export function RenamingCrumb({ chat, renaming }: RenamingCrumbProps): ReactElement {
	return (
		<span className="wg-ws-crumb" data-ws-crumb="">
			<TabRenameField
				named={{ id: chat.id, label: null, title: chat.title }}
				className="wg-ws-row-field"
				onDone={() => renaming.stop()}
			/>
		</span>
	);
}
