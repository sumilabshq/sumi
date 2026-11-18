import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { DiffRange, FileDiff } from "@sumi/git/contract";
import { TrackedBody } from "../file-diff-view/tracked-body.js";
import { UntrackedBody } from "../file-diff-view/untracked-body.js";

export interface OpenedChangeProps {
	readonly folder: string;
	readonly range: DiffRange;
	readonly file: FileDiff;
}

export function OpenedChange({ folder, range, file }: OpenedChangeProps): ReactElement {
	if (file.isUntracked) {
		return <UntrackedBody folder={folder} path={file.path} />;
	}

	return <TrackedBody folder={folder} range={range} file={file} />;
}
