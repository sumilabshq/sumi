import { createElement as h } from "react";
import type { ReactElement } from "react";
import { RenameField } from "../../../app-host/ui/rename-field/rename-field.js";
import type { ChatRenaming } from "../../lib/chat-renaming.js";

export interface RenamingCrumbProps {
	readonly workspace: string;
	readonly chat: { readonly id: string; readonly title: string };
	readonly renaming: ChatRenaming;
}

export function RenamingCrumb({ workspace, chat, renaming }: RenamingCrumbProps): ReactElement {
	return (
		<span className="wg-ws-crumb" data-ws-crumb="">
			<span className="wg-ws-crumb-workspace">{workspace}</span>
			<span className="wg-ws-crumb-slash" aria-hidden="true">
				/
			</span>
			<RenameField
				named={{ id: chat.id, label: null, title: chat.title }}
				className="wg-ws-row-field"
				onDone={() => renaming.stop()}
			/>
		</span>
	);
}
