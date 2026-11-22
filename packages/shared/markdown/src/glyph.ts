import { createIcon } from "@widgetarium/kit/icon-markup";

export type GlyphName = "check" | "chevron-down" | "copy" | "move-horizontal" | "play" | "text-wrap";

export function createGlyph(page: Document, name: GlyphName): SVGSVGElement {
	return createIcon(page, name);
}
