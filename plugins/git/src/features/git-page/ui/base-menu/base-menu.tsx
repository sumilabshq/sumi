import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { BranchesQuery, CommitsQuery } from "@sumi/git";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { presetBasesOf } from "../../lib/base-choices.js";
import { headLabelOf, rangeInputOf, useGitPage } from "../../lib/git-page-context.js";
import { fuzzyFiltered } from "../../lib/fuzzy-rank.js";
import { MenuRow } from "../menu-row/menu-row.js";
import { MenuSection } from "../menu-section/menu-section.js";
import type { MenuProps } from "../repo-menu/repo-menu.js";

const COMPARE_AGAINST = "Compare against";
const COMMITS_ON = "Commits on {head}";
const OTHER_BRANCHES = "Other branches";
const COMMIT_TEXT = "{short} {title}";

export function BaseMenu({ filter, close }: MenuProps): ReactElement | null {
	const page = useGitPage();
	const branches = useOptionalQuery(BranchesQuery, { root: page.root }).data?.branches ?? null;
	const commits = useOptionalQuery(CommitsQuery, rangeInputOf(page)).data?.commits ?? [];

	if (branches === null) {
		return null;
	}

	const head = headLabelOf(page);
	const chosen = page.address.base;
	const allPresets = presetBasesOf(branches, head);
	const presets = fuzzyFiltered(allPresets, filter, ({ label }) => label);
	const others = fuzzyFiltered(
		branches.filter(({ name }) => name !== head && !allPresets.some(({ base }) => base === name)),
		filter,
		({ name }) => name,
	);
	const shownCommits = fuzzyFiltered(commits, filter, ({ short, title }) =>
		COMMIT_TEXT.replace("{short}", short).replace("{title}", title),
	);
	const pick = (base: string): void => {
		close();
		page.go({
			base,
			only: null,
		});
	};
	return (
		<Fragment>
			<MenuSection label={COMPARE_AGAINST} isShown hasRule={false}>
				{presets.map((choice) => (
					<MenuRow
						key={choice.base}
						glyph={choice.glyph}
						isChosen={choice.base === chosen}
						label={choice.label}
						hint={choice.hint}
						onPick={() => pick(choice.base)}
					/>
				))}
			</MenuSection>
			<MenuSection label={COMMITS_ON.replace("{head}", head)} isShown={shownCommits.length > 0} hasRule>
				{shownCommits.map((commit) => (
					<MenuRow
						key={commit.sha}
						glyph="commit"
						isChosen={commit.sha === chosen}
						label={commit.title}
						hint={commit.short}
						onPick={() => pick(commit.sha)}
					/>
				))}
			</MenuSection>
			<MenuSection label={OTHER_BRANCHES} isShown={others.length > 0} hasRule>
				{others.map(({ name }) => (
					<MenuRow key={name} glyph="branch" isChosen={name === chosen} label={name} onPick={() => pick(name)} />
				))}
			</MenuSection>
		</Fragment>
	);
}
