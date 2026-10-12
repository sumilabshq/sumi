import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { DrawnReference } from "../../../schemas/design.schema.js";
import type { Drawing } from "../../../schemas/drawing.schema.js";
import { NotedPicture } from "../frames/noted-picture.js";
import type { WidgetOpener } from "../frames/noted-picture.js";
import { Group } from "./group.js";
import { Region } from "./region.js";

export interface ReferencesRegionProps {
	readonly references: readonly DrawnReference[];
	readonly opener: WidgetOpener;
}

const REFERENCES = "References";

export function ReferencesRegion({ references, opener }: ReferencesRegionProps): ReactElement | null {
	if (references.length === 0) return null;
	return (
		<Region title={REFERENCES} count={references.length}>
			{references.map((reference) => (
				<Group key={reference.name} title={titleOf(reference)} badge={reference.kind} sub={reference.why}>
					<NotedPicture reference={reference} opener={opener} />
				</Group>
			))}
		</Region>
	);
}

export function widgetOpenerOf(registry: Drawing["registry"], open: (widget: string) => void): WidgetOpener {
	return {
		open,
		nameOf: (widget) => {
			const title = registry.get(widget)?.manifest["title"];
			return typeof title === "string" ? title : widget;
		},
	};
}

function titleOf(reference: DrawnReference): string {
	const name = reference.name.split("/").pop() ?? reference.name;
	return decodeURIComponent(name.split("?")[0] ?? name);
}
