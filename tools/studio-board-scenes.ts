import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import type { LookProp } from "./studio-board-measure.ts";

export interface Pair {
	readonly name: string;
	readonly board: string;
	readonly built: string;
	readonly only?: readonly LookProp[];
	readonly skip?: readonly LookProp[];
	readonly isPlaced?: boolean;
	readonly waived?: Partial<Record<LookProp, string>>;
}

export interface Scene {
	readonly name: string;
	readonly board: string;
	readonly boardSize?: readonly [number, number];
	readonly pairs: readonly Pair[];
	readonly enter: (page: AskedPage) => Promise<void>;
	readonly leave: (page: AskedPage) => Promise<void>;
}

export interface Alignment {
	readonly name: string;
	readonly measure: string;
}

export const CHATS_CONTENT_AXIS = `(() => document.querySelector("[data-ws-new-chat] svg")?.getBoundingClientRect().left ?? null)()`;

export const CHAT_HEADER_CENTRE = `(() => { const box = document.querySelector('.wg-plate-head.is-chat button[aria-label="Hide chats"]')?.getBoundingClientRect(); return box ? box.top + box.height / 2 : null; })()`;

const SETTLE_MS = 450;
const ON_THE_HEADER_LINE =
	"the person's guide rule: the top row is the plate header's height, so its icons share the header's centre line (board puts them 4px higher)";
const BELOW_THE_HEADER_LINE = "everything under the top row moves down with it by the 8px the header-line row adds";
const BESIDE_THE_APP =
	"the board draws the chat plate alone; the studio has the app plate open beside it, and plate widths are the frame's layout";
const OTHER_WORDS = "the fixture's crumb names another page than the board's";
const MENU_OPEN_ON_BOARD =
	"the board draws this button with its view menu open; the chats column has no view menu yet, which is behaviour, not look";
const INK_BOARD_PALETTE =
	"Ink-menus paints in the ink boards' palette (overlay .86, warm dark ink); the chrome boards Ws, Tb and Lc paint every menu with overlay .9 and shadow-pop, and the studio draws one menu look";
const ONE_CONTENT_AXIS =
	"the person's guide rule: the workspace name's text stands on the column's content axis with every row (board leaves it 2px right)";
const SAME_INSETS_BOTH_SIDEBARS =
	"the person's rule: the chats column takes the tabs column's side insets (8px from the window edge), so its rows stand 6px further out and 12px wider than the board's";
const SAME_INSETS_WIDTH: Partial<Record<LookProp, string>> = {
	width: SAME_INSETS_BOTH_SIDEBARS,
	paintWidth: SAME_INSETS_BOTH_SIDEBARS,
};
const SAME_INSETS_PLACE: Partial<Record<LookProp, string>> = {
	...SAME_INSETS_WIDTH,
	left: SAME_INSETS_BOTH_SIDEBARS,
};
const OTHER_ITEMS = "the menu holds other items than the board's (content, not look)";
const BLOOM_MS = 650;
const REST_POINT = 720;
const TEXT_SIZE: readonly LookProp[] = ["width"];
const GLYPH: readonly LookProp[] = ["width", "height", "color", "opacity"];
const WORDS: readonly LookProp[] = ["fontFamily", "fontSize", "fontWeight", "letterSpacing", "color", "opacity"];

const CENTRE_OF = `((selector) => { const found = document.querySelector(selector); if (!found) return null; const box = found.getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })`;

async function centreOf(page: AskedPage, selector: string): Promise<readonly [number, number]> {
	const at = await page.ask(`${CENTRE_OF}(${JSON.stringify(selector)})`);
	if (!Array.isArray(at) || typeof at[0] !== "number" || typeof at[1] !== "number") {
		throw new Error(`nothing on the studio answers ${selector}`);
	}

	return [at[0], at[1]];
}

async function hovering(page: AskedPage, selector: string): Promise<void> {
	const [x, y] = await centreOf(page, selector);
	await page.hover(x, y);
	await waited(SETTLE_MS);
}

async function pressing(page: AskedPage, selector: string): Promise<void> {
	const [x, y] = await centreOf(page, selector);
	await page.press(x, y);
	await waited(BLOOM_MS);
}

async function pointingAt(page: AskedPage, selector: string): Promise<void> {
	await page.ask(
		`((selector) => { const found = document.querySelector(selector); const box = found.getBoundingClientRect(); found.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 })); return true; })(${JSON.stringify(selector)})`,
	);
	await waited(BLOOM_MS);
}

async function rested(page: AskedPage): Promise<void> {
	await page.ask(
		`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); document.activeElement?.blur?.(); true`,
	);
	await page.hover(REST_POINT, REST_POINT);
	await waited(SETTLE_MS);
}

const STILL = {
	enter: async (): Promise<void> => undefined,
	leave: async (): Promise<void> => undefined,
};

const SECTION = "[data-tabs-section]";
const SHOWN_TAB = "[data-tabs-item=tab][data-shown]";
const RESTING_TAB = "[data-tabs-list] > [data-tabs-item=tab]:not([data-shown])";
const PLAIN_BOX = "[data-tabs-box]:not([data-hue])";
const HUED_BOX = "[data-tabs-box][data-hue]";

const CHATS_COLUMN: readonly Pair[] = [
	{
		name: "column",
		board: "nav.lc",
		built: "[data-ws-column]",
		isPlaced: true,
		skip: ["height"],
		waived: {
			paddingLeft: SAME_INSETS_BOTH_SIDEBARS,
			paddingRight: SAME_INSETS_BOTH_SIDEBARS,
			paddingBottom: SAME_INSETS_BOTH_SIDEBARS,
		},
	},
	{
		name: "top row",
		board: "nav.lc .ctl",
		built: ".wg-ws-top",
		isPlaced: true,
		waived: {
			...SAME_INSETS_PLACE,
			height: ON_THE_HEADER_LINE,
			paintHeight: ON_THE_HEADER_LINE,
		},
	},
	{
		name: "filter button",
		board: "nav.lc .ctl .x-ib",
		built: ".wg-ws-top-button",
		isPlaced: true,
		waived: {
			top: ON_THE_HEADER_LINE,
			left: SAME_INSETS_BOTH_SIDEBARS,
		},
	},
	{ name: "filter glyph", board: "nav.lc .ctl .x-ib svg", built: ".wg-ws-top-button svg", only: GLYPH },
	{
		name: "header",
		board: "nav.lc .cch",
		built: ".wg-ws-head",
		isPlaced: true,
		waived: {
			...SAME_INSETS_PLACE,
			top: BELOW_THE_HEADER_LINE,
			paddingLeft: ONE_CONTENT_AXIS,
		},
	},
	{
		name: "workspace name",
		board: "nav.lc .cch .ws",
		built: ".wg-ws-name",
		isPlaced: true,
		skip: TEXT_SIZE,
		waived: { top: BELOW_THE_HEADER_LINE, left: ONE_CONTENT_AXIS },
	},
	{ name: "name chevron", board: "nav.lc .cch .ws svg", built: ".wg-ws-name svg", only: GLYPH },
	{
		name: "new chat",
		board: "nav.lc .x-row.newc",
		built: "[data-ws-new-chat]",
		isPlaced: true,
		waived: {
			...SAME_INSETS_PLACE,
			top: BELOW_THE_HEADER_LINE,
		},
	},
	{ name: "new chat glyph", board: "nav.lc .x-row.newc svg", built: "[data-ws-new-chat] svg", only: GLYPH },
	{
		name: "section head",
		board: "nav.lc .sh",
		built: '[data-ws-section="Pinned"] .wg-ws-section-head',
		waived: SAME_INSETS_WIDTH,
	},
	{
		name: "section label",
		board: "nav.lc .sh .lab",
		built: '[data-ws-section="Pinned"] .wg-ws-section-label',
		skip: TEXT_SIZE,
	},
	{
		name: "selected row",
		board: "nav.lc .x-row.lift",
		built: ".wg-ws-row.is-active",
		waived: SAME_INSETS_WIDTH,
	},
	{
		name: "selected title",
		board: "nav.lc .x-row.lift .t",
		built: ".wg-ws-row.is-active .wg-ws-row-title",
		only: WORDS,
	},
	{
		name: "resting row",
		board: "nav.lc .sh ~ .x-row:has(.bdot)",
		built: '[data-ws-chat="checks"]',
		waived: SAME_INSETS_WIDTH,
	},
	{ name: "unread dot", board: "nav.lc .bdot", built: ".wg-ws-unread" },
	{ name: "spinner", board: "nav.lc .spin", built: ".wg-ws-spin" },
	{
		name: "routines",
		board: "nav.lc .tabs > .x-row:nth-last-child(2)",
		built: ".wg-ws-foot .wg-ws-line-row:first-child",
		waived: SAME_INSETS_WIDTH,
	},
	{
		name: "settings",
		board: "nav.lc .tabs > .x-row:last-child",
		built: ".wg-ws-foot .wg-ws-line-row:last-child",
		waived: SAME_INSETS_WIDTH,
	},
	{
		name: "strip",
		board: "nav.lc .wsbar",
		built: "[data-ws-strip]",
		isPlaced: true,
		waived: {
			...SAME_INSETS_PLACE,
			top: SAME_INSETS_BOTH_SIDEBARS,
		},
	},
	{
		name: "strip current",
		board: "nav.lc .wsi.on",
		built: '[data-ws-strip-id="default"]',
		isPlaced: true,
		waived: {
			left: SAME_INSETS_BOTH_SIDEBARS,
			top: SAME_INSETS_BOTH_SIDEBARS,
		},
	},
	{ name: "strip current glyph", board: "nav.lc .wsi.on svg", built: '[data-ws-strip-id="default"] svg', only: GLYPH },
	{ name: "strip rest", board: 'nav.lc .wsi[aria-label="Urcraft"]', built: '[data-ws-strip-id="urcraft"]' },
	{
		name: "strip emoji",
		board: 'nav.lc .wsi[aria-label="Widgetarium"] span',
		built: '[data-ws-strip-id="widgetarium"] .wg-ws-emoji',
	},
	{ name: "strip dot", board: "nav.lc .wsi .dot", built: ".wg-ws-strip .wg-ws-dot" },
	{ name: "strip new", board: 'nav.lc .wsi[aria-label="New workspace"]', built: ".wg-ws-strip-icon.is-new" },
];

const CHAT_PLATE: readonly Pair[] = [
	{ name: "frame", board: "div.sm", built: ".wg-shell", only: ["paddingTop", "paddingLeft", "background", "fontSize"] },
	{
		name: "chat plate",
		board: "main.x-plate",
		built: ".wg-shell-plate.is-chat",
		isPlaced: true,
		skip: ["width", "height"],
		waived: { paintWidth: BESIDE_THE_APP },
	},
	{
		name: "chat header",
		board: "main.x-plate > header",
		built: ".wg-plate-head.is-chat .wg-plate-head-row",
		isPlaced: true,
		skip: ["width"],
		waived: { paintWidth: BESIDE_THE_APP },
	},
	{
		name: "chats toggle",
		board: "main.x-plate > header > button.x-ib",
		built: '.wg-plate-head.is-chat button[aria-label="Hide chats"]',
		isPlaced: true,
	},
	{
		name: "chats toggle glyph",
		board: "main.x-plate > header > button.x-ib > svg",
		built: '.wg-plate-head.is-chat button[aria-label="Hide chats"] svg',
		only: GLYPH,
	},
	{
		name: "chat crumb",
		board: "main.x-plate > header > .x-crumb",
		built: ".wg-plate-head.is-chat .wg-ws-crumb",
		isPlaced: true,
		skip: TEXT_SIZE,
	},
	{
		name: "crumb workspace",
		board: "main.x-plate > header > .x-crumb > span:nth-child(1)",
		built: ".wg-plate-head.is-chat .wg-ws-crumb-workspace",
		only: WORDS,
	},
	{
		name: "crumb slash",
		board: "main.x-plate > header > .x-crumb > span:nth-child(2)",
		built: ".wg-plate-head.is-chat .wg-ws-crumb-slash",
		only: WORDS,
	},
	{
		name: "crumb chat",
		board: "main.x-plate > header > .x-crumb > span:nth-child(3)",
		built: ".wg-plate-head.is-chat .wg-ws-crumb-chat",
		only: WORDS,
	},
];

const TABS_COLUMN: readonly Pair[] = [
	{
		name: "tabs column",
		board: "aside.tabs",
		built: "[data-tabs-sidebar]",
		only: ["width", "rowGap", "fontSize", "color"],
	},
	{ name: "essentials grid", board: "aside .ess", built: "[data-tabs-essentials]", isPlaced: true },
	{ name: "essential tile", board: "aside .es", built: "[data-tabs-item=essential]", isPlaced: true },
	{ name: "essential art", board: "aside .es svg", built: "[data-tabs-item=essential] svg", only: ["width", "height"] },
	{ name: "section head", board: "aside .sh", built: SECTION },
	{
		name: "section words",
		board: "aside .sh > span:not(.acts)",
		built: `${SECTION} > span:first-of-type`,
		only: WORDS,
	},
	{ name: "section title", board: "aside .sh b", built: "[data-tabs-chat-title]", only: WORDS },
	{ name: "plain group", board: "aside .grp.plain", built: PLAIN_BOX, skip: ["height"] },
	{ name: "tinted group", board: "aside .grp.tint", built: HUED_BOX, skip: ["height"] },
	{ name: "plain group head", board: "aside .grp.plain .gh", built: `${PLAIN_BOX} [data-tabs-item=group]` },
	{ name: "tinted group head", board: "aside .grp.tint .gh", built: `${HUED_BOX} [data-tabs-item=group]` },
	{
		name: "group count",
		board: "aside .grp.plain .gh .n",
		built: `${PLAIN_BOX} [data-tabs-item=group] [data-card-count]`,
		only: WORDS,
	},
	{
		name: "group chevron",
		board: "aside .grp.plain .gh svg",
		built: `${PLAIN_BOX} [data-tabs-item=group] [data-card-chevron] svg`,
		only: GLYPH,
	},
	{ name: "shown row", board: "aside .x-row.lift", built: SHOWN_TAB },
	{ name: "shown row words", board: "aside .x-row.lift .t", built: `${SHOWN_TAB} [data-tabs-words]`, only: WORDS },
	{
		name: "shown row art",
		board: "aside .x-row.lift svg.ic",
		built: `${SHOWN_TAB} svg[data-tab-art]`,
		only: ["width", "height"],
	},
	{ name: "shown row close", board: "aside .x-row.lift .cx", built: `${SHOWN_TAB} [data-host-close-tab]` },
	{
		name: "grouped row",
		board: "aside .grp.plain .x-row:not(.lift)",
		built: `${PLAIN_BOX} [data-tabs-item=tab]:not([data-shown])`,
	},
	{ name: "resting row", board: "aside > button.x-row:not(:last-child)", built: RESTING_TAB },
	{
		name: "resting row words",
		board: "aside > button.x-row:not(:last-child) .t",
		built: `${RESTING_TAB} [data-tabs-words]`,
		only: WORDS,
	},
];

const APP_HEAD: readonly Pair[] = [
	{
		name: "app header",
		board: 'main[aria-label="Changes"] > header',
		built: ".wg-plate-head.is-app .wg-plate-head-row",
		skip: ["width", "left"],
		waived: { paintWidth: BESIDE_THE_APP },
	},
	{
		name: "forward (off)",
		board: 'main[aria-label="Changes"] > header > button[aria-label="Forward"]',
		built: '.wg-plate-head.is-app button[aria-label="Forward"]',
	},
	{
		name: "app crumb",
		board: 'main[aria-label="Changes"] > header > .x-crumb',
		built: ".wg-plate-head.is-app .wg-plate-crumb",
		skip: TEXT_SIZE,
		waived: { paintWidth: OTHER_WORDS },
	},
	{
		name: "more",
		board: 'main[aria-label="Changes"] > header > button[aria-label="More"]',
		built: '.wg-plate-head.is-app button[aria-label="More"]',
	},
	{
		name: "tabs toggle",
		board: 'main[aria-label="Changes"] > header > button[aria-label="Hide tabs"]',
		built: '.wg-plate-head.is-app button[aria-label="Hide tabs"]',
	},
	{
		name: "tabs toggle glyph",
		board: 'main[aria-label="Changes"] > header > button[aria-label="Hide tabs"] > svg',
		built: '.wg-plate-head.is-app button[aria-label="Hide tabs"] svg',
		only: GLYPH,
	},
];

export const SCENES: readonly Scene[] = [
	{ name: "chats-rest", board: "Fx-inter-chat", pairs: [...CHATS_COLUMN, ...CHAT_PLATE], ...STILL },
	{ name: "tabs-rest", board: "Lc-13", pairs: TABS_COLUMN, ...STILL },
	{ name: "app-head-rest", board: "Gt-narrow", boardSize: [1728, 1080], pairs: APP_HEAD, ...STILL },
	{
		name: "chats-section-hover",
		board: "Lc-hover",
		boardSize: [380, 900],
		pairs: [
			{
				name: "hovered section head",
				board: "nav.lc .sh.hov",
				built: '[data-ws-section="Pinned"] .wg-ws-section-head',
				waived: SAME_INSETS_WIDTH,
			},
			{
				name: "hovered fold",
				board: "nav.lc .sh.hov .x-ib.fold",
				built: '[data-ws-section="Pinned"] .wg-ws-section-fold',
			},
			{
				name: "hovered view button",
				board: "nav.lc .sh.hov .acts .x-ib",
				built: '[data-ws-section="Pinned"] .wg-ws-section-act',
				waived: { color: MENU_OPEN_ON_BOARD, background: MENU_OPEN_ON_BOARD, radius: MENU_OPEN_ON_BOARD },
			},
		],
		enter: (page) => hovering(page, '[data-ws-section="Pinned"] .wg-ws-section-head'),
		leave: rested,
	},
	{
		name: "chat-row-hover",
		board: "Fx-inter-chat",
		pairs: [
			{
				name: "hovered row",
				board: "nav.lc .x-row.hov",
				built: '[data-ws-chat="deepl"]',
				waived: SAME_INSETS_WIDTH,
			},
			{ name: "hovered more", board: "nav.lc .x-row.hov .cx.mo", built: '[data-ws-chat="deepl"] .wg-ws-row-more' },
		],
		enter: (page) => hovering(page, '[data-ws-chat="deepl"]'),
		leave: rested,
	},
	{
		name: "tabs-section-hover",
		board: "Tb6-sections",
		boardSize: [420, 1000],
		pairs: [
			{ name: "hovered section", board: "aside .sh.hov", built: SECTION, skip: ["width"] },
			{ name: "hovered fold", board: "aside .sh.hov .x-ib.fold", built: "[data-tabs-fold]" },
			{ name: "hovered view button", board: "aside .sh.hov .acts .x-ib", built: "[data-tabs-view-options]" },
		],
		enter: (page) => hovering(page, SECTION),
		leave: rested,
	},
	{
		name: "workspace-menu",
		board: "Ws-menu",
		boardSize: [380, 900],
		pairs: [
			{
				name: "menu",
				board: ".menu.x-pop",
				built: ".wg-kit-pop:has([data-ws-menu])",
				skip: ["height"],
				waived: { paintHeight: OTHER_ITEMS },
			},
			{ name: "menu current", board: ".menu .mi.on", built: "[data-ws-menu] .wg-kit-pop-item[data-state=checked]" },
			{
				name: "menu glyph",
				board: ".menu .mi.on .hic",
				built: "[data-ws-menu] .wg-kit-pop-item[data-state=checked] .wg-ws-item-glyph",
			},
			{ name: "menu key", board: ".menu .mi .k", built: "[data-ws-menu] .wg-ws-item-key" },
			{ name: "menu line", board: ".menu .msep", built: "[data-ws-menu] .wg-kit-pop-sep" },
			{ name: "menu item", board: ".menu .msep + .mi", built: "[data-ws-item=look]" },
			{ name: "menu item glyph", board: ".menu .msep + .mi svg", built: "[data-ws-item=look] svg", only: GLYPH },
		],
		enter: (page) => pressing(page, "[data-ws-name]"),
		leave: rested,
	},
	{
		name: "tabs-group-menu",
		board: "Tb4-group-menu",
		boardSize: [420, 1000],
		pairs: [
			{
				name: "group menu",
				board: ".menu",
				built: ".wg-kit-pop:has([data-tabs-group-menu])",
				skip: ["height"],
				waived: { paintHeight: OTHER_ITEMS },
			},
			{ name: "name field", board: ".menu .nf", built: "[data-tabs-group-name]" },
			{ name: "colour label", board: ".menu .mlab", built: "[data-tabs-group-name] + div" },
			{ name: "swatches", board: ".menu .sw", built: "[data-tabs-group-menu] [role=radiogroup]" },
			{ name: "hue swatch", board: ".menu .sw .h-red", built: "[data-tabs-hue=red]" },
			{ name: "no colour, picked", board: ".menu .sw .none", built: "[data-tabs-hue=none]" },
			{ name: "menu row", board: ".menu .mi", built: "[data-tabs-group-action=ungroup]" },
			{ name: "menu row glyph", board: ".menu .mi svg", built: "[data-tabs-group-action=ungroup] svg", only: GLYPH },
		],
		enter: (page) => pointingAt(page, `${PLAIN_BOX} [data-tabs-item=group]`),
		leave: rested,
	},
	{
		name: "tabs-view-menu",
		board: "Tb3-view-menu",
		boardSize: [420, 1000],
		pairs: [
			{
				name: "view menu",
				board: ".menu",
				built: "[role=menu]",
				skip: ["height", "width"],
				waived: { paintHeight: OTHER_ITEMS },
			},
			{ name: "view menu row", board: ".menu .mi", built: "[data-tabs-new-group]" },
		],
		enter: async (page) => {
			await hovering(page, SECTION);
			await pressing(page, "[data-tabs-view-options]");
		},
		leave: rested,
	},
	{
		name: "tab-pointer-menu",
		board: "Ink-menus",
		boardSize: [1440, 1240],
		pairs: [
			{
				name: "pointer menu",
				board: ".menu",
				built: "[data-tabs-pointer-menu]",
				only: ["width", "paddingTop", "paddingLeft", "rowGap", "background", "radius", "shadow"],
				waived: { background: INK_BOARD_PALETTE, shadow: INK_BOARD_PALETTE },
			},
			{
				name: "pointer menu row",
				board: ".menu .mi",
				built: "[data-tabs-pointer-menu] [role=menuitem]",
				only: ["height", "paddingTop", "paddingLeft", "columnGap", "fontSize", "fontWeight", "color", "radius"],
				waived: { color: INK_BOARD_PALETTE },
			},
			{
				name: "pointer menu line",
				board: ".menu .sep",
				built: "[data-tabs-pointer-menu] [role=separator]",
				only: ["height", "background"],
				waived: { background: INK_BOARD_PALETTE },
			},
		],
		enter: (page) => pointingAt(page, "[data-tabs-list] > [data-tabs-item=tab]"),
		leave: rested,
	},
	{
		name: "workspace-picker",
		board: "Ws-pick-emoji",
		boardSize: [380, 900],
		pairs: [
			{ name: "picker", board: ".pick.x-pop", built: ".wg-kit-pop:has([data-ws-look])", skip: ["height"] },
			{ name: "picker name", board: ".pick .nmrow label", built: ".wg-ws-pick-name", skip: TEXT_SIZE },
			{ name: "picker tab on", board: ".pick .tabsw button.on", built: '.wg-ws-pick-tab[aria-selected="true"]' },
			{
				name: "picker tab off",
				board: ".pick .tabsw button:not(.on):not(.rm)",
				built: '.wg-ws-pick-tab[aria-selected="false"]',
			},
			{ name: "search", board: ".pick .q", built: ".wg-ws-pick-search" },
			{ name: "grid", board: ".pick .gr", built: ".wg-ws-pick-grid" },
			{ name: "cell on", board: ".pick .gr button.on", built: '.wg-ws-pick-cell[aria-selected="true"]' },
			{ name: "cell", board: ".pick .gr button:not(.on)", built: '.wg-ws-pick-cell[aria-selected="false"]' },
		],
		enter: async (page) => {
			await page.ask(
				`window.__studio.workspaces.currentWorkspace.saveCurrentWorkspace({ currentId: "widgetarium", openingId: null }, "board scene"); true`,
			);
			await pressing(page, "[data-ws-name]");
			await pressing(page, "[data-ws-item=look]");
		},
		leave: async (page) => {
			await rested(page);
			await page.ask(
				`window.__studio.workspaces.currentWorkspace.saveCurrentWorkspace({ currentId: "default", openingId: null }, "board scene"); true`,
			);
			await waited(SETTLE_MS);
		},
	},
	{
		name: "strip-tooltip",
		board: "Ws-strip",
		boardSize: [380, 900],
		pairs: [
			{ name: "strip tip", board: ".wtip", built: "[data-tip-face]", skip: TEXT_SIZE },
			{ name: "tip key", board: ".wtip .x-kbd", built: ".wg-kit-tooltip-key" },
		],
		enter: async (page) => {
			await hovering(page, '[data-ws-strip-id="urcraft"]');
			await waited(BLOOM_MS);
		},
		leave: rested,
	},
];

const ICON_ROW_CENTRES = `(() => {
	const centreY = (selector) => { const found = document.querySelector(selector); if (!found) return null; const box = found.getBoundingClientRect(); return box.top + box.height / 2; };
	const said = { filter: centreY(".wg-ws-top-button"), chatToggle: centreY('.wg-plate-head.is-chat button[aria-label="Hide chats"]'), appBack: centreY('.wg-plate-head.is-app button[aria-label="Back"]') };
	const missing = Object.entries(said).filter(([, one]) => one === null).map(([name]) => name);
	if (missing.length > 0) return "missing " + missing.join(", ");
	const off = Object.entries(said).filter(([, one]) => Math.abs(one - said.chatToggle) > 0.5);
	return off.length === 0 ? null : "centre-y " + Object.entries(said).map(([name, one]) => name + " " + Math.round(one * 10) / 10).join(" · ");
})`;

const TABS_TOP = `(() => {
	const boxOf = (selector) => document.querySelector(selector)?.getBoundingClientRect() ?? null;
	const plate = boxOf(".wg-shell-plate.is-app");
	const header = boxOf('.wg-plate-head.is-app button[aria-label="Back"]');
	const essentials = document.querySelector("[data-tabs-essentials] [data-tabs-item=essential]") === null ? null : boxOf("[data-tabs-essentials]");
	const head = boxOf("[data-tabs-section]");
	if (plate === null || header === null || head === null) return "missing app plate, its header or the tabs section head";
	const round = (one) => Math.round(one * 10) / 10;
	if (essentials !== null) {
		return Math.abs(essentials.top - plate.top) <= 0.5 ? null : "essentials start at " + round(essentials.top) + " · app plate at " + round(plate.top);
	}
	const headCentre = head.top + head.height / 2;
	const headerCentre = header.top + header.height / 2;
	return Math.abs(headCentre - headerCentre) <= 0.5 ? null : "section head centre-y " + round(headCentre) + " · app header centre-y " + round(headerCentre);
})`;

const ONE_EDGE = (rows: string, glyph: string, words: string): string => `(() => {
	const rows = [...document.querySelectorAll(${JSON.stringify(rows)})];
	const boxes = (selector) => rows.map((row) => row.querySelector(selector)?.getBoundingClientRect()).filter((box) => box !== undefined && box.width > 0);
	const glyphs = ${JSON.stringify(glyph)} === "" ? [] : boxes(${JSON.stringify(glyph)});
	const words = boxes(${JSON.stringify(words)});
	const spread = (values) => values.length === 0 ? 0 : Math.max(...values) - Math.min(...values);
	const listed = (values) => [...new Set(values.map((one) => Math.round(one * 10) / 10))].join("/");
	const centres = glyphs.map((box) => box.left + box.width / 2);
	const faults = [];
	if (rows.length < 2 || (${JSON.stringify(glyph)} !== "" && glyphs.length < rows.length) || words.length < rows.length) faults.push("rows " + rows.length + ", glyphs " + glyphs.length + ", words " + words.length);
	if (spread(centres) > 0.5) faults.push("glyph centre-x " + listed(centres));
	if (spread(words.map((box) => box.left)) > 0.5) faults.push("text axis " + listed(words.map((box) => box.left)));
	return faults.length === 0 ? null : faults.join(" · ");
})`;

export const ALIGNMENTS: readonly Alignment[] = [
	{ name: "sidebar top row on the plate header line", measure: ICON_ROW_CENTRES },
	{ name: "tabs column first row on the app plate's guide", measure: TABS_TOP },
	{
		name: "chats column glyph rows: one glyph axis, one text axis",
		measure: ONE_EDGE("[data-ws-new-chat], .wg-ws-foot .wg-ws-line-row", ":scope > svg", ":scope > span"),
	},
	{
		name: "chat rows: one text axis",
		measure: ONE_EDGE(".wg-ws-row", "", ".wg-ws-row-title"),
	},
	{
		name: "tabs rows: one glyph axis, one text axis",
		measure: ONE_EDGE(
			"[data-tabs-list] > [data-tabs-item=tab]",
			":scope > [data-tab-art], :scope > svg",
			":scope > [data-tabs-words], :scope > span:not([data-tab-art])",
		),
	},
	{
		name: "grouped tabs rows: one glyph axis, one text axis",
		measure: ONE_EDGE("[data-tabs-box] [data-tabs-item=tab]", ":scope > [data-tab-art]", ":scope > [data-tabs-words]"),
	},
	{
		name: "chrome words cannot be selected",
		measure: `(() => {
			const free = [".wg-ws-name", ".wg-ws-row-title", "[data-tabs-words]", ".wg-plate-head .wg-ws-crumb"].filter((selector) => {
				const found = document.querySelector(selector);
				return found === null || getComputedStyle(found).userSelect !== "none";
			});
			return free.length === 0 ? null : "selectable or missing: " + free.join(", ");
		})`,
	},
	{
		name: "nothing paints under the traffic lights",
		measure: `(() => {
			const top = document.elementsFromPoint(12, 12).find((one) => getComputedStyle(one).visibility !== "hidden" && Number(getComputedStyle(one).opacity) > 0);
			const shell = document.querySelector(".wg-shell");
			return top === undefined || top === shell || top.contains(shell) || shell.contains(top) && !top.closest(".wg-kit-tooltip-host") ? null : "drawn at 12,12: " + top.tagName + "." + [...top.classList].join(".");
		})`,
	},
	{
		name: "chats column: one content axis",
		measure: `(() => {
			const lefts = { name: ".wg-ws-name-text", newChat: "[data-ws-new-chat] svg", section: ".wg-ws-section-label", routines: ".wg-ws-foot .wg-ws-line-row svg" };
			const said = Object.entries(lefts).map(([name, selector]) => [name, document.querySelector(selector)?.getBoundingClientRect().left ?? null]);
			const found = said.filter(([, left]) => left !== null).map(([, left]) => left);
			if (found.length < said.length) return "missing " + said.filter(([, left]) => left === null).map(([name]) => name).join(", ");
			return Math.max(...found) - Math.min(...found) <= 0.5 ? null : said.map(([name, left]) => name + " " + Math.round(left * 10) / 10).join(" · ");
		})`,
	},
];
