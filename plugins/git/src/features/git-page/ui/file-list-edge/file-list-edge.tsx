import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useFileListResize } from "../../lib/use-file-list-resize.js";

export interface FileListEdgeProps {
	readonly px: number;
}

const RESIZE_LABEL = "Resize file list";

export function FileListEdge({ px }: FileListEdgeProps): ReactElement {
	const [edge, setEdge] = useState<HTMLElement | null>(null);
	const handlers = useFileListResize(edge, px);
	return (
		<div
			ref={setEdge}
			className="wg-git-edge"
			role="separator"
			aria-orientation="vertical"
			aria-label={RESIZE_LABEL}
			aria-valuenow={px}
			tabIndex={0}
			{...handlers}
		/>
	);
}
