import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { ChatMenu } from "../chat-menu/chat-menu.js";
import { ChatMenuLine } from "../chat-menu/chat-menu-line.js";
import { ChatMenuNote } from "../chat-menu/chat-menu-note.js";
import { ChatMenuRow } from "../chat-menu/chat-menu-row.js";
import type { SlashMenu as SlashMenuState } from "../../lib/use-slash-menu.js";

export interface SlashMenuProps {
	readonly slash: SlashMenuState;
	readonly draft: string;
}

const NO_MATCH = "No commands match “{typed}”";
const TAB = "Tab";
const ENTER = "↵";
const INSERT = "Insert";
const RUN = "Run";

export function SlashMenu({ slash, draft }: SlashMenuProps): ReactElement {
	return (
		<ChatMenu spot={slash.spot} onDismiss={slash.dismiss}>
			{slash.matches.length === 0 ? <ChatMenuNote>{NO_MATCH.replace("{typed}", draft)}</ChatMenuNote> : null}
			{slash.matches.map((entry) => (
				<ChatMenuRow
					key={entry.name}
					text={`/${entry.name}`}
					small={entry.said}
					mark={<Icon name={entry.icon} size={16} />}
					isActive={entry.name === slash.active?.name}
					onPick={() => slash.run(entry)}
				/>
			))}
			{slash.matches.length === 0 ? null : (
				<>
					<ChatMenuLine />
					<div className="wg-studio-ai-menu-foot">
						<span className="wg-studio-ai-menu-hint">
							<kbd>{TAB}</kbd>
							{INSERT}
						</span>
						<span className="wg-studio-ai-menu-hint">
							<kbd>{ENTER}</kbd>
							{RUN}
						</span>
					</div>
				</>
			)}
		</ChatMenu>
	);
}
