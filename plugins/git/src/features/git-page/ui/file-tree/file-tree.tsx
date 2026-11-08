import { createElement as h, Fragment, useMemo } from "react";
import type { ReactElement } from "react";
import type { FileDiff } from "@sumi/git";
import { fileTreeRowsOf } from "../../lib/file-tree.js";
import { useClosedFolders } from "../../lib/use-closed-folders.js";
import { TreeRow } from "../tree-row/tree-row.js";

export interface FileTreeProps {
	readonly files: readonly FileDiff[];
	readonly filter: string;
	readonly picked: string | null;
	readonly viewed: ReadonlySet<string>;
	onPick(path: string): void;
}

export function FileTree({ files, filter, picked, viewed, onPick }: FileTreeProps): ReactElement {
	const { closed, toggle } = useClosedFolders(filter);
	const rows = useMemo(() => fileTreeRowsOf(files, closed), [files, closed]);
	return (
		<Fragment>
			{rows.map((row) => (
				<TreeRow
					key={row.kind === "folder" ? `folder:${row.path}` : row.file.path}
					row={row}
					picked={picked}
					viewed={viewed}
					onPick={onPick}
					onToggle={toggle}
				/>
			))}
		</Fragment>
	);
}
