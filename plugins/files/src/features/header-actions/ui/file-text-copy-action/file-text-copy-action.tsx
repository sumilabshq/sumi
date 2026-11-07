import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ReadFileQuery } from "@sumi/contract";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { useFileTab } from "../../../../shared/lib/use-file-tab.js";
import { CopyAction } from "../copy-action/copy-action.js";

export interface FileTextCopyActionProps {
	readonly tabId: string;
}

export function FileTextCopyAction({ tabId }: FileTextCopyActionProps): ReactElement {
	const { path } = useFileTab(tabId);
	const read = useOptionalQuery(ReadFileQuery, { path: path ?? "" });
	return <CopyAction copied={path === null ? null : read.data} />;
}
