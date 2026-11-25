import { Fragment, createElement as h, useState } from "react";
import type { ReactNode } from "react";
import { chatContext } from "@sumi/chat-context/contract";
import { assistant } from "@widgetarium/assistant/contract";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { Button, Icon, Popover, PopoverContent, PopoverTrigger, Pressable, tooltipMarks } from "@widgetarium/kit";
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

type Opener = "chip" | "more";

export function ContextBar({ folder }: { readonly folder: string }): ReactNode {
	const context = useOptionalQuery(chatContext.context.read, { folder }).data ?? null;
	const reread = useCommand(chatContext.context.reread);
	const reveal = useCommand(chatContext.context.reveal);
	const openIn = useCommand(chatContext.context.openIn);
	const [opener, setOpener] = useState<Opener | null>(null);
	const chip = chipOf(context);

	if (context === null || chip === null) {
		return null;
	}

	const openerChanged = (which: Opener) => (next: boolean) => {
		setOpener(next ? which : null);

		if (next) {
			void reread.run();
		}
	};

	const menu = (
		<ContextMenu
			context={context}
			onReveal={() => {
				setOpener(null);
				void reveal.run({ folder });
			}}
			onOpenIn={(editor) => {
				setOpener(null);
				void openIn.run({ folder, editor });
			}}
		/>
	);

	return (
		<>
			<Popover open={opener === "chip"} onOpenChange={openerChanged("chip")} isPortaled>
				<PopoverTrigger asChild aria-haspopup="menu">
					<Pressable variant="ghost" tone="faint" className="sumi-chat-context-chip" label={context.folder}>
						<Icon name={chip.icon} size={CHIP_ICON_PX} />
						<span className="sumi-chat-context-label">{chip.label}</span>
					</Pressable>
				</PopoverTrigger>
				<PopoverContent side="bottom" align="start" className="sumi-chat-context-pop">
					{menu}
				</PopoverContent>
			</Popover>
			<Popover open={opener === "more"} onOpenChange={openerChanged("more")} isPortaled>
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
		</>
	);
}
