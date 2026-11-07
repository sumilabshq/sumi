import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useFileTab } from "../../../../shared/lib/use-file-tab.js";
import { CopyAction } from "../copy-action/copy-action.js";

export interface FilePathCopyActionProps {
	readonly tabId: string;
}

export function FilePathCopyAction({ tabId }: FilePathCopyActionProps): ReactElement {
	return <CopyAction copied={useFileTab(tabId).path} />;
}
