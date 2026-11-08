import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GitLookQuery, ToggleFileListCommand } from "@sumi/git";
import { ToggleAction } from "@sumi/sumi-host-plugin";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";

const SHOWN = {
	label: "Hide file list",
	icon: "panel-left-close",
};
const HIDDEN = {
	label: "Show file list",
	icon: "panel-left-open",
};

export function FileListAction(): ReactElement {
	const toggle = useCommand(ToggleFileListCommand);
	return (
		<ToggleAction
			isOn={useOptionalQuery(GitLookQuery).data?.isFileListShown ?? true}
			whenOn={SHOWN}
			whenOff={HIDDEN}
			onToggle={() => void toggle.run()}
		/>
	);
}
