import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { CommitsQuery } from "@sumi/git";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { tooltipMarks } from "@widgetarium/kit";
import { UNCOMMITTED } from "../../lib/git-address.js";
import { rangeInputOf, useGitPage } from "../../lib/git-page-context.js";
import { ageOf, fileCountOf } from "../../lib/git-names.js";
import { Glyph } from "../glyph/glyph.js";

const COMMITS = "Commits";
const UNCOMMITTED_LABEL = "Uncommitted";
const ROW = "wg-git-row";
const PICKED_ROW = "wg-git-row is-sel";

export function CommitList(): ReactElement | null {
	const page = useGitPage();
	const read = useOptionalQuery(CommitsQuery, rangeInputOf(page)).data;
	const uncommitted = read?.uncommitted ?? 0;

	if (read === null || (read.commits.length === 0 && uncommitted === 0)) {
		return null;
	}

	const lookOf = (only: string): string => (page.address.only === only ? PICKED_ROW : ROW);
	const toggle = (only: string): void => page.go({ only: page.address.only === only ? null : only });
	const now = Date.now();
	return (
		<Fragment>
			<div className="wg-git-sec">
				<b>{COMMITS}</b>
				{read.commits.length}
			</div>
			{uncommitted > 0 ? (
				<button className={lookOf(UNCOMMITTED)} onClick={() => toggle(UNCOMMITTED)}>
					<span className="wg-git-dot" />
					<span className="wg-git-nm is-fill">{UNCOMMITTED_LABEL}</span>
					<span className="wg-git-hint">{fileCountOf(uncommitted)}</span>
				</button>
			) : null}
			{read.commits.map((commit) => (
				<button
					key={commit.sha}
					className={lookOf(commit.sha)}
					{...tooltipMarks({ said: commit.short, keys: null })}
					onClick={() => toggle(commit.sha)}
				>
					<Glyph name="commit" />
					<span className="wg-git-nm is-fill">{commit.title}</span>
					<span className="wg-git-hint">{ageOf(commit.at, now)}</span>
				</button>
			))}
		</Fragment>
	);
}
