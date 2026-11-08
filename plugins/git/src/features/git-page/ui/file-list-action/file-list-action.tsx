import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AppViewProps } from "@sumi/apps-plugin";
import { git } from "@sumi/git";
import { ToggleAction } from "@sumi/sumi-host-plugin";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { RepoOnly } from "../repo-only/repo-only.js";

const SHOWN = {
	label: "Hide file list",
	icon: "panel-left-close",
};
const HIDDEN = {
	label: "Show file list",
	icon: "panel-left-open",
};

export function FileListAction({ tabId }: AppViewProps): ReactElement {
	const toggle = useCommand(git.gitLook.toggleFileList);
	return (
		<RepoOnly tabId={tabId}>
			<ToggleAction
				isOn={useOptionalQuery(git.gitLook.gitLook).data?.isFileListShown ?? true}
				whenOn={SHOWN}
				whenOff={HIDDEN}
				onToggle={() => void toggle.run()}
			/>
		</RepoOnly>
	);
}
