import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface FileNoteProps {
	readonly said: string;
}

export function FileNote({ said }: FileNoteProps): ReactElement {
	return (
		<p
			style={{
				margin: 0,
				padding: "24px",
				color: "var(--sumi-text-3)",
				font: "var(--sumi-fw-regular) var(--sumi-fs-13) var(--sumi-font-ui)",
			}}
		>
			{said}
		</p>
	);
}
