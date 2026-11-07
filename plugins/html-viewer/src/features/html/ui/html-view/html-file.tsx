import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ReadFileQuery } from "@sumi/contract";
import { FileNote, useOffersFileActions } from "@sumi/files-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";

export interface HtmlFileProps {
	readonly tabId: string;
	readonly path: string;
}

const SCRIPTS_ONLY = "allow-scripts";

// TODO: relative images, styles and scripts of the page do not load; srcdoc has no base folder
export function HtmlFile({ tabId, path }: HtmlFileProps): ReactElement | null {
	const read = useOptionalQuery(ReadFileQuery, { path });
	useOffersFileActions({
		tabId,
		path,
		copied: () => read.data ?? "",
	});

	if (read.failure !== null) {
		return <FileNote said={read.failure} />;
	}

	if (read.data === null) {
		return null;
	}

	return (
		<iframe
			title={path.slice(path.lastIndexOf("/") + 1)}
			sandbox={SCRIPTS_ONLY}
			srcDoc={read.data}
			style={{
				display: "block",
				width: "100%",
				height: "100%",
				border: "none",
				background: "var(--sumi-plate)",
			}}
		/>
	);
}
