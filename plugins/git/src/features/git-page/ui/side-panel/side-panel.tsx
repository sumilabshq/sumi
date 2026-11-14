import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { git } from "@sumi/git/contract";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { SidePanel as KitSidePanel } from "@widgetarium/kit";
import { headLabelOf, useGitPage } from "../../lib/git-page-context.js";
import { baseLabelOf, fileNameOf } from "../../lib/git-names.js";
import { FILE_LIST_WIDTH_VAR, useFileListResize } from "../../lib/use-file-list-resize.js";
import { BaseMenu } from "../base-menu/base-menu.js";
import { BranchMenu } from "../branch-menu/branch-menu.js";
import { ChangeTotals } from "../change-totals/change-totals.js";
import { CommitList } from "../commit-list/commit-list.js";
import { FileList } from "../file-list/file-list.js";
import { Picker } from "../picker/picker.js";
import { RepoMenu } from "../repo-menu/repo-menu.js";

export interface SidePanelProps {
	readonly px: number;
}

const PANEL_LABEL = "Files and commits";
const RESIZE_LABEL = "Resize file list";
const REPO_LEAD = "{parent} /";
const AGAINST = "against";
const FIND_REPO = "Find a repository";
const FIND_BRANCH = "Find a branch";
const FIND_BASE = "Branch, commit or tag";

export function SidePanel({ px }: SidePanelProps): ReactElement | null {
	const page = useGitPage();
	const isShown = useOptionalQuery(git.gitLook.current).data?.isFileListShown ?? true;
	const [panel, setPanel] = useState<HTMLElement | null>(null);
	const edge = useFileListResize(panel, px);

	if (!isShown) {
		return null;
	}

	return (
		<KitSidePanel
			side="end"
			width={`var(${FILE_LIST_WIDTH_VAR})`}
			label={PANEL_LABEL}
			edgeLabel={RESIZE_LABEL}
			edge={{
				...edge,
				ref: (element: HTMLDivElement | null) => setPanel(element?.parentElement ?? null),
			}}
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
			<FileList />
			<CommitList />
		</KitSidePanel>
	);
}
