import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AppViewProps } from "@sumi/apps-plugin";
import { git } from "@sumi/git";
import { WrapLinesAction } from "@sumi/sumi-host-plugin";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { RepoOnly } from "../repo-only/repo-only.js";

export function WrapAction({ tabId }: AppViewProps): ReactElement {
	const toggle = useCommand(git.gitLook.toggleDiffWrap);
	return (
		<RepoOnly tabId={tabId}>
			<WrapLinesAction
				isWrapped={useOptionalQuery(git.gitLook.gitLook).data?.isWrapped ?? true}
				onToggle={() => void toggle.run()}
			/>
		</RepoOnly>
	);
}
