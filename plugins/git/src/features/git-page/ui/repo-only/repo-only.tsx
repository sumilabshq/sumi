import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useGitTab } from "../../lib/use-git-tab.js";
import { RepoPlaceGate } from "./repo-place-gate.js";

export interface RepoOnlyProps {
	readonly tabId: string;
	readonly children: ReactNode;
}

export function RepoOnly({ tabId, children }: RepoOnlyProps): ReactElement | null {
	const folder = useGitTab(tabId).address?.folder ?? "";

	if (folder === "") {
		return null;
	}

	return <RepoPlaceGate folder={folder}>{children}</RepoPlaceGate>;
}
