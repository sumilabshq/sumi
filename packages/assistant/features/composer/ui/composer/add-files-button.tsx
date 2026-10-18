import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { useAttachesFiles } from "../../lib/use-attaches-files.js";
import { IMAGE_TYPES, TEXT_EXTENSIONS } from "../../lib/attachment-rules.js";

const ATTACH = "Attach images or files";
const PICKED = [...Object.keys(IMAGE_TYPES), ...TEXT_EXTENSIONS].map((extension) => `.${extension}`).join(",");
const HIDDEN = "cv:hidden";

export function AddFilesButton(): ReactElement {
	const picker = useRef<HTMLInputElement>(null);
	const attach = useAttachesFiles();
	return (
		<span className="wg-studio-ai-add" data-add-files="">
			<IconButton variant="neutral" size="s" aria-label={ATTACH} title={ATTACH} onClick={() => picker.current?.click()}>
				<Icon name="plus" />
			</IconButton>
			<input
				ref={picker}
				className={HIDDEN}
				type="file"
				multiple
				accept={PICKED}
				onChange={(event) => {
					attach([...(event.target.files ?? [])]);
					event.target.value = "";
				}}
			/>
		</span>
	);
}
