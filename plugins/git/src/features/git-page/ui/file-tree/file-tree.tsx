import { createElement as h, Fragment, useMemo } from "react";
import type { ReactElement } from "react";
import type { FileDiff } from "@sumi/git";
import { fileTreeRowsOf } from "../../lib/file-tree.js";
import { useClosedFolders } from "../../lib/use-closed-folders.js";
import { FileRow } from "../file-row/file-row.js";
import { FolderRow } from "../folder-row/folder-row.js";

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
			{rows.map((row) =>
				row.kind === "folder" ? (
					<FolderRow
						key={`folder:${row.path}`}
						name={row.name}
						depth={row.depth}
						isOpen={row.isOpen}
						added={row.added}
						removed={row.removed}
						onToggle={() => toggle(row.path)}
					/>
				) : (
					<FileRow
						key={row.file.path}
						file={row.file}
						depth={row.depth}
						isPicked={picked === row.file.path}
						isViewed={viewed.has(row.file.path)}
						onPick={() => onPick(row.file.path)}
					/>
				),
			)}
		</Fragment>
	);
}
