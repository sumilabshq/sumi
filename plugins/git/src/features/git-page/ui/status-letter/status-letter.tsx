import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { FileStatus } from "@sumi/git";
import { statusLetterOf } from "../../lib/git-names.js";

export interface StatusLetterProps {
	readonly status: FileStatus;
}

export function StatusLetter({ status }: StatusLetterProps): ReactElement {
	return (
		<span className="wg-git-st" data-status={status}>
			{statusLetterOf(status)}
		</span>
	);
}
