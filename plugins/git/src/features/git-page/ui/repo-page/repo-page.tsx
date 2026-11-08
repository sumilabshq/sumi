import { createElement as h, useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { GitPlace } from "@sumi/git";
import type { GitAddress } from "../../lib/git-address.js";
import { GitPageContext } from "../../lib/git-page-context.js";
import { DiffList } from "../diff-list/diff-list.js";
import { SidePanel } from "../side-panel/side-panel.js";

export interface RepoPageProps {
	readonly place: Extract<GitPlace, { kind: "repo" }>;
	readonly address: GitAddress;
	go(next: GitAddress): void;
}

export function RepoPage({ place, address, go }: RepoPageProps): ReactElement {
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
			<div className="wg-git-page">
				<SidePanel />
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
