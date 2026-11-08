import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { BranchesQuery } from "@sumi/git";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { headLabelOf, useGitPage } from "../../lib/git-page-context.js";
import { fuzzyFiltered } from "../../lib/fuzzy-rank.js";
import { GitNote } from "../git-note/git-note.js";
import { Glyph } from "../glyph/glyph.js";
import { MenuRow } from "../menu-row/menu-row.js";
import { MenuSection } from "../menu-section/menu-section.js";
import type { MenuProps } from "../repo-menu/repo-menu.js";

const BRANCHES = "Branches";
const STASHES = "Stashes";
const WORKTREE_GLYPH = 14;

export function BranchMenu({ filter, close }: MenuProps): ReactElement | null {
	const page = useGitPage();
	const read = useOptionalQuery(BranchesQuery, { root: page.root });

	if (read.failure !== null) {
		return <GitNote said={read.failure} />;
	}

	if (read.data === null) {
		return null;
	}

	const head = headLabelOf(page);
	const pick = (next: { readonly head: string | null; readonly only: string | null }): void => {
		close();
		page.go(next);
	};
	const stashes = fuzzyFiltered(read.data.stashes, filter, ({ title }) => title);
	return (
		<Fragment>
			<MenuSection label={BRANCHES} isShown hasRule={false}>
				{fuzzyFiltered(read.data.branches, filter, ({ name }) => name).map((branch) => (
						<MenuRow
							key={branch.name}
							glyph="branch"
							isChosen={branch.name === head}
							label={branch.name}
							hint={
								<Fragment>
									{(branch.changed ?? 0) > 0 ? <span className="wg-git-dot" /> : null}
									{branch.worktree === null ? null : <Glyph name="folder" size={WORKTREE_GLYPH} />}
								</Fragment>
							}
							onPick={() => pick({ head: branch.name, only: null })}
						/>
					))}
			</MenuSection>
			<MenuSection label={STASHES} isShown={stashes.length > 0} hasRule>
				{stashes.map((stash) => (
					<MenuRow
						key={stash.ref}
						glyph="stash"
						isChosen={stash.ref === page.address.only}
						label={stash.title}
						hint={stash.ref}
						onPick={() => pick({ head: page.address.head, only: stash.ref })}
					/>
				))}
			</MenuSection>
		</Fragment>
	);
}
