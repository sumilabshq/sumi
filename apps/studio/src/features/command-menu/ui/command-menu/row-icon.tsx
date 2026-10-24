import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { RowIcon as RowIconData } from "@widgetarium/command-menu";

type Glyph = Extract<RowIconData, { kind: "glyph" }>["glyph"];

const ART_ICONS: Readonly<Record<string, string>> = {
	canvas: "shapes",
	browser: "globe",
	git: "git-branch",
	files: "folder",
	routines: "zap",
	settings: "settings",
	note: "file-text",
	table: "table",
	"code-ts": "file-code",
	"code-js": "file-code",
	"code-py": "file-code",
	"code-css": "file-code",
	image: "image",
	"built-app": "app-window",
	site: "globe",
};
const UNKNOWN_ART = "globe";
const GLYPH_ICONS: Readonly<Record<Exclude<Glyph, "ink">, string>> = {
	search: "search",
	globe: "globe",
	plus: "plus",
	chat: "message-circle",
	reopen: "rotate-ccw",
};
const ICON_PX = 16;

export function RowIcon({ icon }: { readonly icon: RowIconData }): ReactElement {
	return <span className="wg-cm-icon">{iconDrawingOf(icon)}</span>;
}

function iconDrawingOf(icon: RowIconData): ReactElement {
	switch (icon.kind) {
		case "favicon":
			return <img className="wg-cm-favicon" src={icon.src} alt="" />;
		case "letter":
			return (
				<span className="wg-cm-letter" data-shape={icon.shape}>
					{icon.letter}
				</span>
			);
		case "art":
			return <Icon name={ART_ICONS[icon.art] ?? UNKNOWN_ART} size={ICON_PX} />;
		case "glyph":
			return icon.glyph === "ink" ? (
				<span className="wg-cm-ink" />
			) : (
				<Icon name={GLYPH_ICONS[icon.glyph]} size={ICON_PX} />
			);
	}
}
