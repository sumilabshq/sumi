import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { TabArtSchema } from "@widgetarium/app-host";
import type { RowIcon as RowIconData } from "@widgetarium/command-menu";
import { TabArt } from "../../../app-host/ui/tab-face/tab-art.js";

type Glyph = Extract<RowIconData, { kind: "glyph" }>["glyph"];

const GLYPH_ICONS: Readonly<Record<Exclude<Glyph, "ink">, string>> = {
	search: "search",
	globe: "globe",
	plus: "plus",
	chat: "message-circle",
	reopen: "rotate-ccw",
};
const ICON_PX = 16;
const UNKNOWN_ART = "site";

export function RowIcon({ icon }: { readonly icon: RowIconData }): ReactElement {
	return <span className="wg-cm-icon">{iconDrawingOf(icon)}</span>;
}

function iconDrawingOf(icon: RowIconData): ReactElement {
	switch (icon.kind) {
		case "tab":
			return (
				<TabArt
					icon={TabArtSchema.catch(UNKNOWN_ART).parse(icon.art)}
					favicon={icon.favicon}
					title={icon.title}
					address={icon.address}
					size="row"
				/>
			);
		case "letter":
			return (
				<span className="wg-cm-letter" data-shape={icon.shape}>
					{icon.letter}
				</span>
			);
		case "glyph":
			return icon.glyph === "ink" ? (
				<span className="wg-cm-ink" />
			) : (
				<Icon name={GLYPH_ICONS[icon.glyph]} size={ICON_PX} />
			);
	}
}
