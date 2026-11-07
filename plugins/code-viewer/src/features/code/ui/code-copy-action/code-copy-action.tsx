import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ReadFileQuery } from "@sumi/contract";
import { CopyAction, useFileSwitches, useFileTab } from "@sumi/files-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { shownCodeOf } from "../../lib/shown-code.js";

export interface CodeCopyActionProps {
	readonly tabId: string;
}

export function CodeCopyAction({ tabId }: CodeCopyActionProps): ReactElement {
	const { path } = useFileTab(tabId);
	return path === null ? <CopyAction copied={null} /> : <KnownCodeCopy path={path} />;
}

function KnownCodeCopy({ path }: { readonly path: string }): ReactElement {
	const read = useOptionalQuery(ReadFileQuery, { path });
	const showsSecrets = useFileSwitches().isOn("values");
	return <CopyAction copied={read.data === null ? null : shownCodeOf(path, read.data, showsSecrets).body} />;
}
