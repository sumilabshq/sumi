import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GitLookQuery, ToggleDiffWrapCommand } from "@sumi/git";
import { WrapLinesAction } from "@sumi/sumi-host-plugin";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";

export function WrapAction(): ReactElement {
	const toggle = useCommand(ToggleDiffWrapCommand);
	return (
		<WrapLinesAction
			isWrapped={useOptionalQuery(GitLookQuery).data?.isWrapped ?? true}
			onToggle={() => void toggle.run()}
		/>
	);
}
