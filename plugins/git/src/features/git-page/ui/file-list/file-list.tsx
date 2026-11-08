import { createElement as h, Fragment, useState } from "react";
import type { ReactElement } from "react";
import { ComparisonQuery, GitLookQuery } from "@sumi/git";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { comparisonInputOf, useGitPage } from "../../lib/git-page-context.js";
import { anchorOf } from "../../lib/git-names.js";
import { fuzzyFiltered } from "../../lib/fuzzy-rank.js";
import { FileListHead } from "../file-list-head/file-list-head.js";
import { FileRow } from "../file-row/file-row.js";
import { FileTree } from "../file-tree/file-tree.js";
import { SearchField } from "../search-field/search-field.js";

const FILTER = "Filter files";

export function FileList(): ReactElement | null {
	const page = useGitPage();
	const files = useOptionalQuery(ComparisonQuery, comparisonInputOf(page)).data?.files ?? null;
	const isTree = useOptionalQuery(GitLookQuery).data?.isFileTree ?? false;
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
		<Fragment>
			<FileListHead count={files.length} viewedCount={page.viewed.size} isTree={isTree} />
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
		</Fragment>
	);
}
