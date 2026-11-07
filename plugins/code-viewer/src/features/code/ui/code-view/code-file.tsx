import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import { ReadFileQuery } from "@sumi/contract";
import { FileNote, useOffersFileActions } from "@sumi/files-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { CODE_PAGE_CLASS } from "../../lib/code-page-sheet.js";
import { shownCodeOf } from "../../lib/shown-code.js";
import { useRendersCodeFile } from "../../lib/use-renders-code-file.js";

export interface CodeFileProps {
	readonly tabId: string;
	readonly path: string;
}

export function CodeFile({ tabId, path }: CodeFileProps): ReactElement {
	const read = useOptionalQuery(ReadFileQuery, { path });
	const shown = useMemo(() => (read.data === null ? null : shownCodeOf(path, read.data)), [path, read.data]);
	const holder = useRendersCodeFile(shown);
	useOffersFileActions({
		tabId,
		path,
		copied: () => shown?.body ?? "",
	});

	if (read.failure !== null) {
		return <FileNote said={read.failure} />;
	}

	return (
		<div className={`wg-chat-app ${CODE_PAGE_CLASS}`}>
			<div className="wg-studio-ai-said is-markdown">
				<div ref={holder} />
			</div>
		</div>
	);
}
