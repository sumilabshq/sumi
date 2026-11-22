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
				color: "var(--text-3)",
				font: "var(--fw-regular) var(--fs-13) var(--font-ui)",
			}}
		>
			{said}
		</p>
	);
}
