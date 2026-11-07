import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ReadFileQuery } from "@sumi/contract";
import { FileNote, SourcePage, useFileSwitches } from "@sumi/files-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";

export interface HtmlFileProps {
	readonly path: string;
}

const SCRIPTS_ONLY = "allow-scripts";
const HTML = "html";

// TODO: relative images, styles and scripts of the page do not load; srcdoc has no base folder
export function HtmlFile({ path }: HtmlFileProps): ReactElement | null {
	const read = useOptionalQuery(ReadFileQuery, { path });
	const switches = useFileSwitches();

	if (read.failure !== null) {
		return <FileNote said={read.failure} />;
	}

	if (read.data === null) {
		return null;
	}

	if (switches.isOn("source")) {
		return <SourcePage body={read.data} language={HTML} wraps={false} />;
	}

	return (
		<iframe
			key={switches.loads}
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
