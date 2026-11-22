import { Fragment, createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { FilePicker, Icon, IconButton } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { useMenuOpening } from "../../lib/menu-spot.js";
import { ChatMenu } from "../chat-menu/chat-menu.js";
import { ChatMenuLine } from "../chat-menu/chat-menu-line.js";
import { ChatMenuNote } from "../chat-menu/chat-menu-note.js";
import { ChatMenuRow } from "../chat-menu/chat-menu-row.js";
import { useAttachesFiles } from "../../lib/use-attaches-files.js";
import { assistant } from "@widgetarium/assistant/contract";
import { useChatKey } from "../../../../shared/lib/chat-key-context.js";

const ADD = "Add";
const ATTACH_FILES = "Attach images or files";
const ATTACH_FOLDER = "Attach a folder";
const DROP_OR_PASTE = "Drop or paste anywhere in the chat";

export function ComposerTools(): ReactElement {
	const picker = useRef<HTMLInputElement>(null);
	const attach = useAttachesFiles();
	const chat = useChatKey();
	const attachFolder = useCommand(assistant.composer.attachFolder);
	const { canAttachFolders, accepted } = useQuery(assistant.composer.attachReach, { chat }).data;
	const plus = useMenuOpening();
	return (
		<>
			<IconButton
				variant="ghost"
				size="xs"
				aria-pressed={plus.spot !== null}
				className={`wg-studio-ai-plus${plus.spot === null ? "" : " is-on"}`}
				label={ADD}
				aria-haspopup="menu"
				onClick={plus.openAt}
			>
				<Icon name="plus" size={16} />
			</IconButton>
			<FilePicker
				ref={picker}
				className="cv:hidden"
				multiple
				accept={accepted}
				onChange={(event) => {
					attach([...(event.target.files ?? [])]);
					event.target.value = "";
				}}
			/>
			<ChatMenu spot={plus.spot} onDismiss={plus.close}>
				<ChatMenuRow
					text={ATTACH_FILES}
					mark={<Icon name="upload" size={16} />}
					onPick={() => {
						plus.close();
						picker.current?.click();
					}}
				/>
				{canAttachFolders ? (
					<ChatMenuRow
						text={ATTACH_FOLDER}
						mark={<Icon name="folder" size={16} />}
						onPick={() => {
							plus.close();
							void attachFolder.run({ chat });
						}}
					/>
				) : null}
				<ChatMenuLine />
				<ChatMenuNote>{DROP_OR_PASTE}</ChatMenuNote>
			</ChatMenu>
		</>
	);
}
