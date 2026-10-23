import { Fragment, createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { useMenuOpening } from "../../../../shared/lib/menu-spot.js";
import { GlassMenu } from "../../../../shared/ui/glass-menu/glass-menu.js";
import { GlassMenuLine } from "../../../../shared/ui/glass-menu/glass-menu-line.js";
import { GlassMenuNote } from "../../../../shared/ui/glass-menu/glass-menu-note.js";
import { GlassMenuRow } from "../../../../shared/ui/glass-menu/glass-menu-row.js";
import { AttachFolderCommand, AttachReachQuery } from "../../contract.js";
import { IMAGE_TYPES, TEXT_EXTENSIONS } from "../../lib/attachment-rules.js";
import { useAttachesFiles } from "../../lib/use-attaches-files.js";

const ADD = "Add";
const ATTACH_FILES = "Attach images or files";
const ATTACH_FOLDER = "Attach a folder…";
const DROP_OR_PASTE = "Drop or paste anywhere in the chat";
const PICKED = [...Object.keys(IMAGE_TYPES), ...TEXT_EXTENSIONS].map((extension) => `.${extension}`).join(",");
const PLUS_MENU_PX = 316;

export function ComposerTools(): ReactElement {
	const picker = useRef<HTMLInputElement>(null);
	const attach = useAttachesFiles();
	const attachFolder = useCommand(AttachFolderCommand);
	const { canAttachFolders } = useQuery(AttachReachQuery).data;
	const plus = useMenuOpening();
	return (
		<>
			<button
				type="button"
				className={`wg-studio-ai-plus${plus.spot === null ? "" : " is-on"}`}
				aria-label={ADD}
				aria-haspopup="menu"
				onClick={plus.openAt}
			>
				<Icon name="plus" size={18} />
			</button>
			<input
				ref={picker}
				className="cv:hidden"
				type="file"
				multiple
				accept={PICKED}
				onChange={(event) => {
					attach([...(event.target.files ?? [])]);
					event.target.value = "";
				}}
			/>
			<GlassMenu spot={plus.spot} width={PLUS_MENU_PX} onDismiss={plus.close}>
				<GlassMenuRow
					text={ATTACH_FILES}
					mark={<Icon name="upload" size={16} />}
					onPick={() => {
						plus.close();
						picker.current?.click();
					}}
				/>
				{canAttachFolders ? (
					<GlassMenuRow
						text={ATTACH_FOLDER}
						mark={<Icon name="folder" size={16} />}
						onPick={() => {
							plus.close();
							void attachFolder.run();
						}}
					/>
				) : null}
				<GlassMenuLine />
				<GlassMenuNote>{DROP_OR_PASTE}</GlassMenuNote>
			</GlassMenu>
		</>
	);
}
