import { Fragment, createElement as h, useContext, useState } from "react";
import type { ReactNode } from "react";
import { chatContext } from "@sumi/chat-context/contract";
import { appHost } from "@widgetarium/app-host/contract";
import { assistant } from "@widgetarium/assistant/contract";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { Button, Icon, Popover, PopoverContent, PopoverTrigger, Pressable, tooltipMarks } from "@widgetarium/kit";
import { WindowAppContext } from "../../../../shared/lib/window-app-context.js";
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
	const enterIn = useCommand(chatContext.context.enterIn);
	const windowApp = useContext(WindowAppContext);
	const [isOpen, setOpen] = useState(false);
	const chip = chipOf(context);

	if (context === null || chip === null) {
		return null;
	}

	const setOpenAndReread = (next: boolean): void => {
		setOpen(next);

		if (next) {
			void reread.run();
		}
	};

	return (
		<>
			<Popover open={isOpen} onOpenChange={setOpenAndReread} isPortaled>
				<PopoverTrigger asChild aria-haspopup="menu">
					<Pressable variant="ghost" tone="muted" className="sumi-chat-context-chip" label={context.folder}>
						<Icon name={chip.icon} size={CHIP_ICON_PX} />
						<span className="sumi-chat-context-label">{chip.label}</span>
					</Pressable>
				</PopoverTrigger>
				<PopoverContent side="bottom" align="start" className="sumi-chat-context-pop">
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
						onOpenTerminal={() => {
							setOpen(false);

							if (windowApp === null) {
								return;
							}

							void windowApp.send(appHost.tabActions.openTab, { app: "terminal" }).then((opened) => {
								if (opened.ok) {
									void enterIn.run({ session: opened.output.id, folder });
								}
							});
						}}
					/>
				</PopoverContent>
			</Popover>
			<Button
				shape="square"
				emphasis="ghost"
				size="xs"
				label={MORE}
				className="sumi-chat-context-more"
				onClick={() => setOpenAndReread(!isOpen)}
				{...tooltipMarks({ said: MORE })}
			>
				<Icon name="ellipsis" size={MORE_ICON_PX} />
			</Button>
		</>
	);
}
