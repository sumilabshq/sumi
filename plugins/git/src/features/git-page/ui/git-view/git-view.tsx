import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AppViewProps } from "@sumi/apps-plugin";
import { GIT_SHEET } from "../../lib/git-sheet.js";
import { useGitTab } from "../../lib/use-git-tab.js";
import { GitPlace } from "../git-place/git-place.js";
import { NoRepo } from "../no-repo/no-repo.js";

const APP_NAME = "Git";
const NO_FOLDER = "No folder";
const NO_FOLDER_SAID = "Open a folder, or ask Sumi to open one here.";

export function GitView({ tabId }: AppViewProps): ReactElement | null {
	const tab = useGitTab(tabId);

	if (tab.address === null) {
		return null;
	}

	return (
		<main
			className="wg-git wg-root"
			aria-label={APP_NAME}
		>
			<style>{GIT_SHEET}</style>
			{tab.address.folder === "" ? (
				<NoRepo title={NO_FOLDER} said={NO_FOLDER_SAID} repos={[]} go={tab.go} />
			) : (
				<GitPlace address={tab.address} go={tab.go} />
			)}
		</main>
	);
}
