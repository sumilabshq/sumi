import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { git } from "@sumi/git/contract";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { SidePanelSection } from "@widgetarium/kit";
import { comparisonInputOf, useGitPage } from "../../lib/git-page-context.js";
import { anchorOf } from "../../lib/git-names.js";
import { fuzzyFiltered } from "../../lib/fuzzy-rank.js";
import { FileShapeAction } from "../file-shape-action/file-shape-action.js";
import { FileRow } from "../file-row/file-row.js";
import { FileTree } from "../file-tree/file-tree.js";
import { SearchField } from "../search-field/search-field.js";

const FILTER = "Filter files";
const FILES = "Files {count}";
const VIEWED = "{viewed} of {count} viewed";

export function FileList(): ReactElement | null {
	const page = useGitPage();
	const files = useOptionalQuery(git.repos.comparison, comparisonInputOf(page)).data?.files ?? null;
	const isTree = useOptionalQuery(git.gitLook.current).data?.isFileTree ?? false;
	const [filter, setFilter] = useState("");
	const [picked, setPicked] = useState<string | null>(null);

	if (files === null) {
		return null;
	}

	const pick = (path: string): void => {
		setPicked(path);
		document.getElementById(anchorOf(path))?.scrollIntoView({ block: "start" });
	};
	const shown = fuzzyFiltered(files, filter, ({ path }) => path);
	return (
		<SidePanelSection
			label={(page.viewed.size === 0 ? FILES : VIEWED)
				.replace("{count}", String(files.length))
				.replace("{viewed}", String(page.viewed.size))}
			action={<FileShapeAction isTree={isTree} />}
		>
			<SearchField value={filter} placeholder={FILTER} isFocused={false} onChange={setFilter} />
			{isTree ? (
				<FileTree files={shown} filter={filter} picked={picked} viewed={page.viewed} onPick={pick} />
			) : (
				shown.map((file) => (
					<FileRow
						key={file.path}
						file={file}
						isPicked={picked === file.path}
						isViewed={page.viewed.has(file.path)}
						onPick={() => pick(file.path)}
					/>
				))
			)}
		</SidePanelSection>
	);
}
