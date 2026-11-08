import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { NearbyReposQuery } from "@sumi/git";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { useGitPage } from "../../lib/git-page-context.js";
import { fuzzyFiltered } from "../../lib/fuzzy-rank.js";
import { GitNote } from "../git-note/git-note.js";
import { MenuRow } from "../menu-row/menu-row.js";
import { MenuSection } from "../menu-section/menu-section.js";

export interface MenuProps {
	readonly filter: string;
	close(): void;
}

const IN_FOLDER = "In {folder}";

export function RepoMenu({ filter, close }: MenuProps): ReactElement | null {
	const page = useGitPage();
	const nearby = useOptionalQuery(NearbyReposQuery, { root: page.root });

	if (nearby.failure !== null) {
		return <GitNote said={nearby.failure} />;
	}

	if (nearby.data === null) {
		return null;
	}

	return (
		<MenuSection label={IN_FOLDER.replace("{folder}", nearby.data.parent)} isShown hasRule={false}>
			{fuzzyFiltered(nearby.data.repos, filter, ({ name }) => name).map((repo) => (
					<MenuRow
						key={repo.path}
						glyph="folder"
						isChosen={repo.path === page.root}
						label={repo.name}
						hint={
							<Fragment>
								{repo.changed > 0 ? <span className="wg-git-dot" /> : null}
								{repo.branch ?? ""}
							</Fragment>
						}
						onPick={() => {
							close();
							page.go({
								folder: repo.path,
								head: null,
								only: null,
							});
						}}
					/>
				))}
		</MenuSection>
	);
}
