import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import type { Pair, Scene } from "./tabs-sidebar-diff.ts";

const SHOWN = "[data-tabs-item=tab][data-shown]";
const RESTING_TOP = "[data-tabs-list] > [data-tabs-item=tab]:not([data-shown])";
const PLAIN_BOX = "[data-tabs-box]:not([data-hue])";
const HUED_BOX = "[data-tabs-box][data-hue]";
const SECTION = "[data-tabs-section]";
const MENU_SETTLED_MS = 700;
const COLOURS = ["color", "backgroundColor", "boxShadow"];

export const CENTRE_OF = `((selector) => { const el = document.querySelector(selector); if (!el) return null; const box = el.getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })`;

export async function centreOf(page: AskedPage, selector: string): Promise<readonly [number, number]> {
	const at = await page.ask(`${CENTRE_OF}(${JSON.stringify(selector)})`);

	if (!Array.isArray(at) || typeof at[0] !== "number" || typeof at[1] !== "number") {
		throw new Error(`nothing on the page answers ${selector}`);
	}

	return [at[0], at[1]];
}

export function pointedAt(selector: string): string {
	return `((selector) => { const el = document.querySelector(selector); const box = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 })); return true; })(${JSON.stringify(selector)})`;
}

const STILL = {
	enter: async () => undefined,
	leave: async () => undefined,
};

const LIST_PAIRS: readonly Pair[] = [
	{
		name: "sidebar",
		board: "aside.tabs",
		built: "[data-tabs-sidebar]",
		only: ["width", "rowGap", "fontSize", "color"],
	},
	{ name: "essentials grid", board: "aside .ess", built: "[data-tabs-essentials]", skip: ["width"] },
	{ name: "essential tile", board: "aside .es", built: "[data-tabs-item=essential]" },
	{ name: "essential art", board: "aside .es svg", built: "[data-tabs-item=essential] svg", only: ["width", "height"] },
	{ name: "section head", board: "aside .sh", built: SECTION },
	{
		name: "section words",
		board: "aside .sh > span:not(.acts)",
		built: `${SECTION} > span:first-of-type`,
		only: ["fontSize", "fontWeight", "color"],
	},
	{
		name: "section title",
		board: "aside .sh b",
		built: "[data-tabs-chat-title]",
		only: ["fontSize", "fontWeight", "color"],
	},
	{
		name: "plain group",
		board: "aside .grp.plain",
		built: PLAIN_BOX,
		skip: ["backgroundColor", "height", "borderTopLeftRadius"],
	},
	{
		name: "plain group plate",
		board: "aside .grp.plain",
		built: PLAIN_BOX,
		builtPseudo: "::before",
		only: ["backgroundColor", "borderTopLeftRadius", "width", "height"],
	},
	{
		name: "tinted group plate",
		board: "aside .grp.tint",
		built: HUED_BOX,
		builtPseudo: "::before",
		only: ["backgroundColor", "borderTopLeftRadius", "width", "height"],
	},
	{ name: "plain group head", board: "aside .grp.plain .gh", built: `${PLAIN_BOX} [data-tabs-item=group]` },
	{ name: "tinted group head", board: "aside .grp.tint .gh", built: `${HUED_BOX} [data-tabs-item=group]` },
	{
		name: "group count",
		board: "aside .grp.plain .gh .n",
		built: `${PLAIN_BOX} [data-tabs-item=group] > span:last-child`,
		only: ["fontSize", "fontWeight", "color"],
	},
	{
		name: "group chevron",
		board: "aside .grp.plain .gh svg",
		built: `${PLAIN_BOX} [data-tabs-item=group] svg`,
		only: ["width", "height"],
	},
	{ name: "shown row", board: "aside .x-row.lift", built: SHOWN },
	{
		name: "shown row words",
		board: "aside .x-row.lift .t",
		built: `${SHOWN} [data-tabs-words]`,
		only: ["fontSize", "fontWeight", "color"],
	},
	{
		name: "shown row art",
		board: "aside .x-row.lift svg.ic",
		built: `${SHOWN} svg[data-tab-art]`,
		only: ["width", "height"],
	},
	{ name: "shown row close", board: "aside .x-row.lift .cx", built: `${SHOWN} [data-host-close-tab]` },
	{
		name: "grouped row",
		board: "aside .grp.plain .x-row:not(.lift)",
		built: `${PLAIN_BOX} [data-tabs-item=tab]:not([data-shown])`,
	},
	{ name: "resting row", board: "aside > button.x-row:not(:last-child)", built: RESTING_TOP },
	{
		name: "resting row words",
		board: "aside > button.x-row:not(:last-child) .t",
		built: `${RESTING_TOP} [data-tabs-words]`,
		only: ["fontSize", "fontWeight", "color"],
	},
	{
		name: "site letter",
		board: "aside .grp.plain .fav8",
		built: `${PLAIN_BOX} [data-tab-art=site]`,
		skip: ["backgroundColor", ...COLOURS.slice(2)],
	},
	{ name: "new tab row", board: "aside > button.x-row:last-child", built: "[data-host-column-add]" },
	{
		name: "new tab plus",
		board: "aside > button.x-row:last-child svg",
		built: "[data-host-column-add] svg",
		only: ["width", "height", "color"],
	},
	{ name: "new tab key", board: "aside > button.x-row:last-child .x-kbd", built: "[data-host-new-tab-key]" },
];

export const LIST_SCENE: Scene = {
	board: "Lc-13",
	pairs: LIST_PAIRS,
	...STILL,
};

export const HOVER_SCENE: Scene = {
	board: "Tb6-sections",
	pairs: [
		{ name: "hovered section", board: "aside .sh.hov", built: SECTION, skip: ["width"] },
		{
			name: "hovered fold",
			board: "aside .sh.hov .x-ib.fold",
			built: "[data-tabs-fold]",
			only: ["width", "height", "opacity", "color"],
		},
		{
			name: "hovered view button",
			board: "aside .sh.hov .acts .x-ib",
			built: "[data-tabs-view-options]",
			skip: ["opacity"],
		},
	],
	enter: async (page) => {
		const [x, y] = await centreOf(page, SECTION);
		await page.hover(x, y);
		await waited(400);
	},
	leave: async (page) => {
		await page.hover(5, 5);
		await waited(200);
	},
};

export const GROUP_MENU_SCENE: Scene = {
	board: "Tb4-group-menu",
	pairs: [
		{ name: "group menu", board: ".menu", built: ".wg-kit-pop:has([data-tabs-group-menu])", skip: ["height"] },
		{ name: "name field", board: ".menu .nf", built: "[data-tabs-group-name]", skip: ["color"] },
		{
			name: "colour label",
			board: ".menu .mlab",
			built: "[data-tabs-group-name] + div",
		},
		{ name: "swatches", board: ".menu .sw", built: "[data-tabs-group-menu] [role=radiogroup]" },
		{ name: "hue swatch", board: ".menu .sw .h-red", built: "[data-tabs-hue=red]" },
		{ name: "no colour, picked", board: ".menu .sw .none", built: "[data-tabs-hue=none]" },
		{
			name: "menu line",
			board: ".menu .msep",
			built: "[data-tabs-group-menu] [role=radiogroup] + div",
			only: ["height", "backgroundColor", "marginTop", "width"],
		},
		{ name: "menu row", board: ".menu .mi", built: "[data-tabs-group-action=ungroup]" },
		{
			name: "menu row icon",
			board: ".menu .mi svg",
			built: "[data-tabs-group-action=ungroup] svg",
			only: ["width", "height", "color"],
		},
	],
	enter: async (page) => {
		await page.ask(pointedAt(`${PLAIN_BOX} [data-tabs-item=group]`));
		await waited(MENU_SETTLED_MS);
	},
	leave: async (page) => {
		await page.ask(
			`document.activeElement?.blur(); document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); true`,
		);
		await waited(300);
	},
};

export const VIEW_MENU_SCENE: Scene = {
	board: "Tb3-view-menu",
	pairs: [
		{ name: "view menu plate", board: ".menu", built: "[role=menu]", skip: ["height", "width"] },
		{ name: "view menu row", board: ".menu .mi", built: "[data-tabs-new-group]", skip: ["backgroundColor"] },
	],
	enter: async (page) => {
		const [x, y] = await centreOf(page, SECTION);
		await page.hover(x, y);
		await waited(300);
		const [bx, by] = await centreOf(page, "[data-tabs-view-options]");
		await page.press(bx, by);
		await waited(400);
	},
	leave: async (page) => {
		await page.ask(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); true`);
		await waited(150);
		await page.ask(`document.activeElement?.blur(); true`);
		await page.hover(5, 5);
		await waited(300);
	},
};

const MENU_GEOMETRY = ["width", "paddingTop", "paddingLeft", "rowGap", "borderTopLeftRadius"];
const ROW_GEOMETRY = [
	"height",
	"paddingTop",
	"paddingLeft",
	"columnGap",
	"fontSize",
	"fontWeight",
	"borderTopLeftRadius",
];

export const POINTER_MENU_SCENE: Scene = {
	board: "Ink-menus",
	pairs: [
		{ name: "pointer menu", board: ".menu", built: "[data-tabs-pointer-menu]", only: MENU_GEOMETRY },
		{
			name: "pointer menu row",
			board: ".menu .mi",
			built: "[data-tabs-pointer-menu] [role=menuitem]",
			only: ROW_GEOMETRY,
		},
		{
			name: "pointer menu line",
			board: ".menu .sep",
			built: "[data-tabs-pointer-menu] [role=separator]",
			only: ["height", "marginTop"],
		},
	],
	enter: async (page) => {
		await page.ask(pointedAt("[data-tabs-list] > [data-tabs-item=tab]"));
		await waited(400);
	},
	leave: async (page) => {
		await page.ask(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); true`);
		await waited(300);
	},
};

export const SCENES: readonly Scene[] = [
	LIST_SCENE,
	HOVER_SCENE,
	GROUP_MENU_SCENE,
	VIEW_MENU_SCENE,
	POINTER_MENU_SCENE,
];
