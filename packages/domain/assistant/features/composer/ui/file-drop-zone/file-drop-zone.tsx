import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface FileDropZoneProps {
	readonly isOver: boolean;
}

const DROP_TO_ATTACH = "Drop to attach";

export function FileDropZone({ isOver }: FileDropZoneProps): ReactElement | null {
	if (!isOver) {
		return null;
	}

	return (
		<div className="wg-studio-ai-drop" aria-hidden="true">
			{DROP_TO_ATTACH}
		</div>
	);
}
