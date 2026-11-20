import { createElement as h } from "react";
import type { ReactElement } from "react";
import { fileSystem } from "@sumi/contract";
import { StoredViewSchema } from "@sumi/view-work/contract";
import type { ViewPart } from "@sumi/view-work/implementation";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { ViewFrame } from "../view-frame/view-frame.js";

export interface SavedViewProps {
	readonly path: string;
	readonly id: string;
	readonly title: string;
	readonly parts: readonly ViewPart[];
}

const NOT_A_VIEW = "This saved view could not be read.";

export function SavedView({ path, id, title, parts }: SavedViewProps): ReactElement | null {
	const read = useOptionalQuery(fileSystem.files.read, { path });

	if (read.failure !== null) {
		return <p style={{ margin: 0, color: "var(--sumi-text-3)" }}>{read.failure}</p>;
	}

	if (read.data === null) {
		return null;
	}

	const stored = StoredViewSchema.safeParse(jsonOf(read.data));

	if (!stored.success) {
		return <p style={{ margin: 0, color: "var(--sumi-text-3)" }}>{NOT_A_VIEW}</p>;
	}

	return <ViewFrame id={id} title={title} html={stored.data.html} parts={parts} />;
}

function jsonOf(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}
