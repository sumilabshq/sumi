import { createElement as h, Fragment, useState } from "react";
import type { ReactElement } from "react";
import { ComparisonQuery } from "@sumi/git";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { comparisonInputOf, useGitPage } from "../../lib/git-page-context.js";
import { anchorOf } from "../../lib/git-names.js";
import { fuzzyFiltered } from "../../lib/fuzzy-rank.js";
import { FileRow } from "../file-row/file-row.js";
import { SearchField } from "../search-field/search-field.js";

const FILES = "Files";
const VIEWED = "{count} viewed";
const FILTER = "Filter files";

export function FileList(): ReactElement | null {
	const page = useGitPage();
	const files = useOptionalQuery(ComparisonQuery, comparisonInputOf(page)).data?.files ?? null;
	const [filter, setFilter] = useState("");
	const [picked, setPicked] = useState<string | null>(null);

	if (files === null) {
		return null;
	}

	const pick = (path: string): void => {
		setPicked(path);
		document.getElementById(anchorOf(path))?.scrollIntoView({ block: "start" });
	};
	return (
		<Fragment>
			<div className="wg-git-sec">
				<b>{FILES}</b>
				{files.length}
				<span className="wg-git-gap" />
				{page.viewed.size === 0 ? null : VIEWED.replace("{count}", String(page.viewed.size))}
			</div>
			<SearchField value={filter} placeholder={FILTER} isFocused={false} onChange={setFilter} />
			{fuzzyFiltered(files, filter, ({ path }) => path).map((file) => (
					<FileRow
						key={file.path}
						file={file}
						isPicked={picked === file.path}
						isViewed={page.viewed.has(file.path)}
						onPick={() => pick(file.path)}
					/>
				))}
		</Fragment>
	);
}
