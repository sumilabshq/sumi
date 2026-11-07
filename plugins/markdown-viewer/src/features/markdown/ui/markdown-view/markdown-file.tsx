import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ReadFileQuery } from "@sumi/contract";
import { FileNote, useOffersFileActions } from "@sumi/files-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { MARKDOWN_PAGE_CLASS } from "../../lib/markdown-page-sheet.js";
import { useRendersMarkdownFile } from "../../lib/use-renders-markdown-file.js";

export interface MarkdownFileProps {
	readonly tabId: string;
	readonly path: string;
}

export function MarkdownFile({ tabId, path }: MarkdownFileProps): ReactElement {
	const read = useOptionalQuery(ReadFileQuery, { path });
	const holder = useRendersMarkdownFile(read.data);
	useOffersFileActions({
		tabId,
		path,
		copied: () => read.data ?? "",
	});

	if (read.failure !== null) {
		return <FileNote said={read.failure} />;
	}

	return (
		<div className={`wg-chat-app ${MARKDOWN_PAGE_CLASS}`}>
			<div className="wg-studio-ai-said is-markdown">
				<div ref={holder} />
			</div>
		</div>
	);
}
