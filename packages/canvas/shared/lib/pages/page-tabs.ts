import { PAGES } from "../../schema/canvas-page.schema.js";
import type { CanvasPages } from "./canvas-pages.js";

export interface PageTab {
	readonly name: string;
	readonly opens: string;
}

export interface PageTabs {
	readonly tabs: readonly PageTab[];
	readonly shown: string;
}

export function pageTabsOf(pages: CanvasPages): PageTabs {
	const firstScreen = pages.screens[0] ?? PAGES;
	const tabOf = (page: string): PageTab => ({ name: page, opens: page });
	return {
		tabs: [...pages.leading.map(tabOf), { name: PAGES, opens: firstScreen }, ...pages.trailing.map(tabOf)],
		shown: pages.screens.includes(pages.shown) ? PAGES : pages.shown,
	};
}
