import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { FileTreeRow } from "../../lib/file-tree.js";
import { FileRow } from "../file-row/file-row.js";
import { FolderRow } from "../folder-row/folder-row.js";

export interface TreeRowProps {
	readonly row: FileTreeRow;
	readonly picked: string | null;
	readonly viewed: ReadonlySet<string>;
	onPick(path: string): void;
	onToggle(path: string): void;
}

export function TreeRow({ row, picked, viewed, onPick, onToggle }: TreeRowProps): ReactElement {
	if (row.kind === "folder") {
		return (
			<FolderRow
				name={row.name}
				depth={row.depth}
				isOpen={row.isOpen}
				added={row.added}
				removed={row.removed}
				onToggle={() => onToggle(row.path)}
			/>
		);
	}

	return (
		<FileRow
			file={row.file}
			depth={row.depth}
			isPicked={picked === row.file.path}
			isViewed={viewed.has(row.file.path)}
			onPick={() => onPick(row.file.path)}
		/>
	);
}
