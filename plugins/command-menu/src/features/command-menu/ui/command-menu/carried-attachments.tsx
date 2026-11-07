import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, tooltipMarks } from "@widgetarium/kit";
import type { AttachmentKind } from "@widgetarium/assistant";
import type { Carried } from "../../lib/carried.js";

export interface CarriedAttachmentsProps {
	readonly carried: Carried;
	readonly onOpen: () => void;
}

const KIND_ICONS: Readonly<Record<AttachmentKind, string>> = {
	image: "image",
	text: "file-text",
	folder: "folder",
};
const ONE_WAITS = "1 attachment waits in Ask";
const MANY_WAIT = "{count} attachments wait in Ask";
const KIND_ICON_PX = 12;

export function CarriedAttachments({ carried, onOpen }: CarriedAttachmentsProps): ReactElement | null {
	if (carried.count === 0) {
		return null;
	}

	const said = carried.count === 1 ? ONE_WAITS : MANY_WAIT.replace("{count}", String(carried.count));
	return (
		<button
			type="button"
			className="wg-cm-carried"
			aria-label={said}
			data-cm-carried={carried.count}
			onMouseDown={(event) => event.preventDefault()}
			onClick={onOpen}
			{...tooltipMarks({ said, side: "bottom" })}
		>
			<span className="wg-cm-carried-stack">
				{carried.kinds.map((kind) => (
					<span key={kind} className="wg-cm-carried-kind" data-kind={kind}>
						<Icon name={KIND_ICONS[kind]} size={KIND_ICON_PX} />
					</span>
				))}
			</span>
			<span className="wg-cm-carried-count">{carried.count}</span>
		</button>
	);
}
