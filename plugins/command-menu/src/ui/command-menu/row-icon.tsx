import { createElement as h } from "react";
import type { ComponentType, ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { RowIcon as RowIconData } from "@sumi/command-menu";
import { useTabFace } from "@sumi/sumi-host-plugin";
import type { TabFaceProps } from "@sumi/sumi-host-plugin";

type Glyph = Extract<RowIconData, { kind: "glyph" }>["glyph"];

const GLYPH_ICONS: Readonly<Record<Exclude<Glyph, "ink">, string>> = {
	search: "search",
	globe: "globe",
	plus: "plus",
	pencil: "pencil",
};
const ICON_PX = 16;

export function RowIcon({ icon }: { readonly icon: RowIconData }): ReactElement {
	const tabFace = useTabFace();
	return <span className="wg-cm-icon">{iconDrawingOf(icon, tabFace)}</span>;
}

function iconDrawingOf(icon: RowIconData, TabFace: ComponentType<TabFaceProps>): ReactElement {
	switch (icon.kind) {
		case "tab":
			return (
				<TabFace art={icon.art} favicon={icon.favicon} title={icon.title} address={icon.address} mark={icon.mark} />
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
