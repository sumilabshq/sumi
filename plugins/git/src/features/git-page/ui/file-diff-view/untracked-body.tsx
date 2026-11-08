import { createElement as h } from "react";
import type { ReactElement } from "react";
import { git } from "@sumi/git/contract";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { GitNote } from "../git-note/git-note.js";
import { DiffBody } from "./diff-body.js";

export interface UntrackedBodyProps {
	readonly folder: string;
	readonly path: string;
}

export function UntrackedBody({ folder, path }: UntrackedBodyProps): ReactElement | null {
	const read = useOptionalQuery(git.repos.untrackedFile, { folder, path });

	if (read.failure !== null) {
		return <GitNote said={read.failure} />;
	}

	if (read.data === null) {
		return null;
	}

	return <DiffBody file={read.data} />;
}
