import { REFERENCES_PAGE } from "../../schema/canvas-page.js";
import type { DrawnReference } from "../../schema/design.js";
import type { Drawing } from "../../schema/drawing.js";
import type { ReferenceShown, Region } from "../../schema/regions.js";

export function referencesRegionOf(references: readonly DrawnReference[], { registry }: Drawing): Region[] {
	if (references.length === 0) return [];
	const nameOf = (widget: string): string => {
		const title = registry.get(widget)?.manifest["title"];
		return typeof title === "string" ? title : widget;
	};
	const shown = references.map((reference): ReferenceShown => ({
		key: reference.name,
		title: titleOf(reference),
		...(reference.kind === undefined ? {} : { badge: reference.kind }),
		...(reference.why === undefined ? {} : { sub: reference.why }),
		src: reference.src,
		alt: reference.why ?? reference.name,
		callouts: reference.notes.map((note) => ({
			text: note.text,
			tone: note.tone,
			...(note.at === undefined ? {} : { at: note.at }),
			widget: note.into ? { id: note.into, name: nameOf(note.into) } : null,
		})),
	}));
	return [{ kind: "references", title: REFERENCES_PAGE, count: shown.length, references: shown }];
}

function titleOf(reference: DrawnReference): string {
	const name = reference.name.split("/").pop() ?? reference.name;
	return decodeURIComponent(name.split("?")[0] ?? name);
}
