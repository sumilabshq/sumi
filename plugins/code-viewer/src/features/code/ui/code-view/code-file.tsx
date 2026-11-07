import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import { ReadFileQuery } from "@sumi/contract";
import { FileNote, SourcePage, useFileSwitches } from "@sumi/files-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { shownCodeOf } from "../../lib/shown-code.js";

export interface CodeFileProps {
	readonly path: string;
}

export function CodeFile({ path }: CodeFileProps): ReactElement | null {
	const read = useOptionalQuery(ReadFileQuery, { path });
	const switches = useFileSwitches();
	const showsSecrets = switches.isOn("values");
	const shown = useMemo(
		() => (read.data === null ? null : shownCodeOf(path, read.data, showsSecrets)),
		[path, read.data, showsSecrets],
	);

	if (read.failure !== null) {
		return <FileNote said={read.failure} />;
	}

	return shown === null ? null : (
		<SourcePage body={shown.body} language={shown.language} wraps={switches.isOn("wrap")} />
	);
}
