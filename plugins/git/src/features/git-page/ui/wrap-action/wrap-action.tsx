import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AppViewProps } from "@sumi/apps-plugin";
import { GitLookQuery, ToggleDiffWrapCommand } from "@sumi/git";
import { WrapLinesAction } from "@sumi/sumi-host-plugin";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { RepoOnly } from "../repo-only/repo-only.js";

export function WrapAction({ tabId }: AppViewProps): ReactElement {
	const toggle = useCommand(ToggleDiffWrapCommand);
	return (
		<RepoOnly tabId={tabId}>
			<WrapLinesAction
				isWrapped={useOptionalQuery(GitLookQuery).data?.isWrapped ?? true}
				onToggle={() => void toggle.run()}
			/>
		</RepoOnly>
	);
}
