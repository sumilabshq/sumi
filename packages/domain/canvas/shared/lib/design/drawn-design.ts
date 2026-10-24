import type { WidgetLookup } from "@widgetarium/core/registry.js";
import type { DrawnDesign } from "../../schema/drawn-design.schema.js";
import { blocksOf } from "./design-block-registry.js";
import { widgetsOnScreens } from "./shown-widgets.js";

const DRAFT_PREFIX = "@draft/";

export function draftsOn(screens: DrawnDesign["screens"]): string[] {
	return [...new Set(widgetsOnScreens(screens).filter(isDraft))];
}

export function changeStampOf(
	registry: Parameters<typeof blocksOf>[0] & Pick<WidgetLookup, "get">,
	modifiedAt: readonly (number | null)[],
	drawn: DrawnDesign | undefined,
): string {
	const screens = drawn?.screens ?? [];
	const blocksNow = draftsOn(screens)
		.map((draft) => blocksOf(registry, draft).join(","))
		.join(";");
	const buildsNow = widgetsDrawnOn(registry, screens, drawn?.widgets ?? [])
		.map((id) => registry.get(id)?.buildKey ?? "")
		.join(",");
	return [...modifiedAt.map((at) => String(at ?? "")), blocksNow, buildsNow].join("|");
}

function isDraft(id: string): boolean {
	return id.startsWith(DRAFT_PREFIX);
}

function widgetsDrawnOn(
	registry: Pick<WidgetLookup, "get">,
	screens: DrawnDesign["screens"],
	widgets: DrawnDesign["widgets"],
): string[] {
	const pages = widgetsOnScreens(screens);
	const used = pages.flatMap((id) => registry.get(id)?.uses ?? []);
	return [...new Set([...pages, ...used, ...widgets.map((widget) => widget.id)])];
}
