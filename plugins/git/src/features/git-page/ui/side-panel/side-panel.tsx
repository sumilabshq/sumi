import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GitLookQuery } from "@sumi/git";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { headLabelOf, useGitPage } from "../../lib/git-page-context.js";
import { baseLabelOf, fileNameOf } from "../../lib/git-names.js";
import { BaseMenu } from "../base-menu/base-menu.js";
import { BranchMenu } from "../branch-menu/branch-menu.js";
import { ChangeTotals } from "../change-totals/change-totals.js";
import { CommitList } from "../commit-list/commit-list.js";
import { FileList } from "../file-list/file-list.js";
import { Picker } from "../picker/picker.js";
import { RepoMenu } from "../repo-menu/repo-menu.js";

const REPO_LEAD = "{parent} /";
const AGAINST = "against";
const FIND_REPO = "Find a repository";
const FIND_BRANCH = "Find a branch";
const FIND_BASE = "Branch, commit or tag";

export function SidePanel(): ReactElement {
	const page = useGitPage();
	const isShown = useOptionalQuery(GitLookQuery).data?.isFileListShown ?? true;
	return (
		<aside
			className="wg-git-side"
			inert={!isShown}
		>
			<Picker
				glyph="folder"
				lead={REPO_LEAD.replace("{parent}", fileNameOf(page.parent))}
				value={page.name}
				placeholder={FIND_REPO}
			>
				{(filter, close) => <RepoMenu filter={filter} close={close} />}
			</Picker>
			<Picker glyph="branch" value={headLabelOf(page)} placeholder={FIND_BRANCH}>
				{(filter, close) => <BranchMenu filter={filter} close={close} />}
			</Picker>
			<Picker glyph="compare" lead={AGAINST} value={baseLabelOf(page.address.base)} placeholder={FIND_BASE}>
				{(filter, close) => <BaseMenu filter={filter} close={close} />}
			</Picker>
			<ChangeTotals />
			<div className="wg-git-lists">
				<FileList />
				<CommitList />
			</div>
		</aside>
	);
}
