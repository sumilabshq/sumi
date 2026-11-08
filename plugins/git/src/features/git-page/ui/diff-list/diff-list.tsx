import { createElement as h, useCallback, useRef, useState } from "react";
import type { ReactElement } from "react";
import { ComparisonQuery } from "@sumi/git";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { comparisonInputOf, useGitPage } from "../../lib/git-page-context.js";
import { useNearPaths } from "../../lib/use-near-paths.js";
import { FileDiffView } from "../file-diff-view/file-diff-view.js";
import { GitNote } from "../git-note/git-note.js";

const NO_CHANGES = "No changes.";

export function DiffList(): ReactElement {
	const page = useGitPage();
	const read = useOptionalQuery(ComparisonQuery, comparisonInputOf(page));
	const comparison = read.data;
	const [scroller, setScroller] = useState<HTMLElement | null>(null);
	const [list, setList] = useState<HTMLElement | null>(null);
	const near = useNearPaths(scroller, list);
	const heights = useRef(new Map<string, number>());
	const keepHeight = useCallback((path: string, px: number) => void heights.current.set(path, px), []);
	return (
		<section ref={setScroller} className="wg-git-diffs">
			{read.failure === null ? null : <GitNote said={read.failure} />}
			{comparison?.files.length === 0 ? <GitNote said={NO_CHANGES} /> : null}
			<div ref={setList}>
				{comparison?.files.map((file) => (
					<FileDiffView
						key={file.path}
						file={file}
						folder={comparison.folder}
						range={comparison.range}
						isViewed={page.viewed.has(file.path)}
						isNear={near.has(file.path)}
						heldHeight={heights.current.get(file.path)}
						onHeight={keepHeight}
						onToggleViewed={() => page.toggleViewed(file.path)}
					/>
				))}
			</div>
		</section>
	);
}
