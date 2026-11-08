import { createElement as h, useCallback, useMemo, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import { GitLookQuery } from "@sumi/git";
import type { GitPlace } from "@sumi/git";
import { useOptionalQuery } from "@widgetarium/data-framework";
import type { GitAddress } from "../../lib/git-address.js";
import { GitPageContext } from "../../lib/git-page-context.js";
import { useRereadsWhileShown } from "../../lib/use-rereads-while-shown.js";
import { FILE_LIST_WIDTH_VAR } from "../../lib/use-file-list-resize.js";
import { FileListEdge } from "../file-list-edge/file-list-edge.js";
import { DiffList } from "../diff-list/diff-list.js";
import { SidePanel } from "../side-panel/side-panel.js";

const DEFAULT_FILE_LIST_PX = 256;

export interface RepoPageProps {
	readonly place: Extract<GitPlace, { kind: "repo" }>;
	readonly address: GitAddress;
	go(next: GitAddress): void;
}

export function RepoPage({ place, address, go }: RepoPageProps): ReactElement {
	useRereadsWhileShown();
	const look = useOptionalQuery(GitLookQuery).data;
	const isFileListShown = look?.isFileListShown ?? true;
	const fileListPx = look?.fileListPx ?? DEFAULT_FILE_LIST_PX;
	const [viewed, setViewed] = useState<ReadonlySet<string>>(new Set());
	const toggleViewed = useCallback((path: string) => setViewed((was) => toggled(was, path)), []);
	const page = useMemo(
		() => ({
			root: place.root,
			name: place.name,
			parent: place.parent,
			branch: place.branch,
			address,
			viewed,
			toggleViewed,
			go: (next: Partial<GitAddress>) =>
				go({
					...address,
					...next,
				}),
		}),
		[place, address, viewed, toggleViewed, go],
	);
	return (
		<GitPageContext.Provider value={page}>
			<div
				className={isFileListShown ? "wg-git-page" : "wg-git-page is-list-hidden"}
				style={{ [FILE_LIST_WIDTH_VAR]: `${String(fileListPx)}px` } as CSSProperties}
			>
				<SidePanel />
				<FileListEdge px={fileListPx} />
				<DiffList />
			</div>
		</GitPageContext.Provider>
	);
}

function toggled(paths: ReadonlySet<string>, path: string): ReadonlySet<string> {
	const next = new Set(paths);

	if (next.has(path)) {
		next.delete(path);
		return next;
	}

	next.add(path);
	return next;
}
