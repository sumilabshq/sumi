import { createElement as h } from "react";
import type { ReactElement } from "react";
import { git } from "@sumi/git/contract";
import type { DiffRange, FileDiff } from "@sumi/git/contract";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { GitNote } from "../git-note/git-note.js";
import { DiffBody } from "./diff-body.js";

export interface TrackedBodyProps {
	readonly folder: string;
	readonly range: DiffRange;
	readonly file: FileDiff;
}

export function TrackedBody({ folder, range, file }: TrackedBodyProps): ReactElement | null {
	const read = useOptionalQuery(git.repos.fileDiff, { folder, range, path: file.path, from: file.from });

	if (read.failure !== null) {
		return <GitNote said={read.failure} />;
	}

	if (read.data === null) {
		return null;
	}

	return <DiffBody file={read.data} />;
}
