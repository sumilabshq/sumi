import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { GLYPH_ICONS } from "../../lib/glyph-paths.js";
import type { GlyphName } from "../../lib/glyph-paths.js";

export interface GlyphProps {
	readonly name: GlyphName;
	readonly size?: number;
}

const ICON_SIZE = 16;
const GLYPH_LOOK = "wg-git-glyph";

export function Glyph({ name, size = ICON_SIZE }: GlyphProps): ReactElement {
	return <Icon name={GLYPH_ICONS[name]} size={size} className={GLYPH_LOOK} />;
}
