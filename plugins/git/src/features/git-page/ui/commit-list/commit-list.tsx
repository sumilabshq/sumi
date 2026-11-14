import { createElement as h } from "react";
import type { ReactElement } from "react";
import { git } from "@sumi/git/contract";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { SidePanelRow, SidePanelSection, tooltipMarks } from "@widgetarium/kit";
import { UNCOMMITTED } from "../../lib/git-address.js";
import { rangeInputOf, useGitPage } from "../../lib/git-page-context.js";
import { ageOf, fileCountOf } from "../../lib/git-names.js";
import { Glyph } from "../glyph/glyph.js";

const COMMITS = "Commits {count}";
const UNCOMMITTED_LABEL = "Uncommitted";

export function CommitList(): ReactElement | null {
	const page = useGitPage();
	const read = useOptionalQuery(git.repos.commits, rangeInputOf(page)).data;
	const uncommitted = read?.uncommitted ?? 0;

	if (read === null || (read.commits.length === 0 && uncommitted === 0)) {
		return null;
	}

	const toggle = (only: string): void => page.go({ only: page.address.only === only ? null : only });
	const now = Date.now();
	return (
		<SidePanelSection label={COMMITS.replace("{count}", String(read.commits.length))} isGrowing>
			{uncommitted > 0 ? (
				<SidePanelRow
					icon={<span className="wg-git-dot" />}
					label={UNCOMMITTED_LABEL}
					end={fileCountOf(uncommitted)}
					isPicked={page.address.only === UNCOMMITTED}
					onClick={() => toggle(UNCOMMITTED)}
				/>
			) : null}
			{read.commits.map((commit) => (
				<SidePanelRow
					key={commit.sha}
					icon={<Glyph name="commit" />}
					label={commit.title}
					end={ageOf(commit.at, now)}
					isPicked={page.address.only === commit.sha}
					{...tooltipMarks({ said: commit.short, keys: null })}
					onClick={() => toggle(commit.sha)}
				/>
			))}
		</SidePanelSection>
	);
}
