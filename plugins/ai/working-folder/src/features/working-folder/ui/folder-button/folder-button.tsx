import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import { Button, Icon, Popover, PopoverContent, PopoverTrigger } from "@widgetarium/kit";
import type { ComposerOptionProps } from "@sumi/chat-plugin";
import { folderNameOf } from "../../lib/short-path.js";
import { FolderMenu } from "./folder-menu.js";

const CHOOSE_A_FOLDER = "Choose a folder";
const WORK_IN_A_FOLDER = "Work in a folder";

export function FolderButton({ chat, surface }: ComposerOptionProps): ReactElement | null {
	const folders = useOptionalQuery(assistant.agent.workingFolders, { chat }).data ?? null;
	const opened = useOptionalQuery(assistant.chat.one, { chat }).data ?? null;
	const choose = useCommand(assistant.agent.chooseWorkingFolder);
	const pickAnother = useCommand(assistant.agent.pickWorkingFolder);
	const [isOpen, setOpen] = useState(false);
	const isFixed = surface === "chat" && (opened?.session.turns.length ?? 0) > 0;

	if (folders === null || isFixed) {
		return null;
	}

	return (
		<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="sm" aria-label={CHOOSE_A_FOLDER}>
					<Icon name="folder" size={12} />
					{folders.current === null ? WORK_IN_A_FOLDER : folderNameOf(folders.current)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="is-compact" side="top" align="start">
				<FolderMenu
					folders={folders}
					onChoose={(path) => {
						setOpen(false);
						void choose.run({ chat, path });
					}}
					onPickAnother={() => {
						setOpen(false);
						void pickAnother.run({ chat });
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}
