import { ICON_TABLE, ICON_VIEW_BOX } from "./icon-table";

export const LUCIDE_NAME_OF: Readonly<Record<string, string>> = {
	chevron: "chevron-right",
	fold: "chevron-left",
	expand: "maximize-2",
	collapse: "minimize-2",
	"corners-out": "maximize",
	"corners-in": "minimize",
	filter: "funnel",
	curve: "chart-line",
	bars: "chart-no-axes-column",
	"grid-plus": "grid-2x2-plus",
	"grid-minus": "grid-2x2-x",
	update: "rotate-cw",
	retry: "rotate-ccw",
	chat: "message-square",
	dots: "ellipsis-vertical",
	terminal: "square-terminal",
	gear: "settings",
	stop: "square",
	close: "x",
	widget: "layout-template",
	"sidebar-left": "panel-left",
	"sidebar-right": "panel-right",
	"open-tab": "external-link",
};

const LUCIDE_BODIES: Readonly<Record<string, string>> = ICON_TABLE;

export interface IconDrawing {
	readonly body: string;
	readonly viewBox: string;
}

export function iconOf(name: unknown): IconDrawing | null {
	if (typeof name !== "string") return null;
	const lucideName = (Object.hasOwn(LUCIDE_NAME_OF, name) ? LUCIDE_NAME_OF[name] : undefined) ?? name;
	const lucideBody = Object.hasOwn(LUCIDE_BODIES, lucideName) ? LUCIDE_BODIES[lucideName] : undefined;
	if (lucideBody === undefined) return null;
	return { body: lucideBody, viewBox: ICON_VIEW_BOX };
}
