import { Fragment, createElement as h, useState } from "react";
import type { ReactNode } from "react";
import { chatContext } from "@sumi/chat-context/contract";
import { assistant } from "@widgetarium/assistant/contract";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { Button, Icon, Popover, PopoverContent, PopoverTrigger, tooltipMarks } from "@widgetarium/kit";
import { chipOf } from "../../lib/chip-of.js";
import { ContextMenu } from "../context-menu/context-menu.js";

const CHIP_ICON_PX = 13;
const MORE_ICON_PX = 16;
const MORE = "Chat context";

export interface ChatContextProps {
	readonly chatId: string;
}

export function ChatContext({ chatId }: ChatContextProps): ReactNode {
	const folder = useOptionalQuery(assistant.agent.workingFolders, { chat: chatId }).data?.current ?? null;
	return folder === null ? null : <ContextBar folder={folder} />;
}

export function ContextBar({ folder }: { readonly folder: string }): ReactNode {
	const context = useOptionalQuery(chatContext.context.read, { folder }).data ?? null;
	const reread = useCommand(chatContext.context.reread);
	const reveal = useCommand(chatContext.context.reveal);
	const openIn = useCommand(chatContext.context.openIn);
	const [isOpen, setOpen] = useState(false);
	const branch = chipOf(context);

	if (context === null) {
		return null;
	}

	const openChanged = (next: boolean) => {
		setOpen(next);

		if (next) {
			void reread.run();
		}
	};

	const menu = (
		<ContextMenu
			context={context}
			onReveal={() => {
				setOpen(false);
				void reveal.run({ folder });
			}}
			onOpenIn={(editor) => {
				setOpen(false);
				void openIn.run({ folder, editor });
			}}
		/>
	);

	return (
		<>
			{branch === null ? null : (
				<span className="sumi-chat-context-chip-slot">
					<span className="sumi-chat-context-chip" title={context.folder}>
						<Icon name="git-branch" size={CHIP_ICON_PX} />
						<span className="sumi-chat-context-label">{branch}</span>
					</span>
				</span>
			)}
			<span className="sumi-chat-context-more-slot">
				<Popover open={isOpen} onOpenChange={openChanged} isPortaled>
					<PopoverTrigger asChild aria-haspopup="menu">
						<Button
							shape="square"
							emphasis="ghost"
							size="xs"
							label={MORE}
							className="sumi-chat-context-more"
							{...tooltipMarks({ said: MORE })}
						>
							<Icon name="ellipsis" size={MORE_ICON_PX} />
						</Button>
					</PopoverTrigger>
					<PopoverContent side="bottom" align="end" className="sumi-chat-context-pop">
						{menu}
					</PopoverContent>
				</Popover>
			</span>
		</>
	);
}
