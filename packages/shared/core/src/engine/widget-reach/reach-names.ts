export type ReachKind =
	"window" | "page" | "storage" | "node" | "text-as-code" | "climb" | "frame" | "webview" | "obsidian";

interface ReachReason {
	readonly why: string;
	readonly instead: string | null;
}

export const REACH_REASONS: Readonly<Record<ReachKind, ReachReason>> = {
	window: {
		why: "reaches the window, and through it every plugin and every guard the browser keeps",
		instead: "listenToWindow from widgetarium/kit for pointer and key events, plain setTimeout for timers",
	},
	page: {
		why: "reaches the page outside the widget's own root",
		instead: "usePortalContainer or portalLayer from widgetarium/kit to float something over the page",
	},
	storage: {
		why: "reads and writes the storage the plugin and the browser keep their own state in",
		instead: "a value kept in the tile, or a command",
	},
	node: {
		why: "reaches Node: files, processes and the network",
		instead: "a query or a command; data reaches a widget only through its ports",
	},
	"text-as-code": {
		why: "runs code built from text, which no check can read",
		instead: null,
	},
	climb: {
		why: "climbs from an element to the page and its window",
		instead: "copyText, listenToWindow or portalLayer from widgetarium/kit",
	},
	frame: {
		why: "climbs into a frame's own window",
		instead: null,
	},
	obsidian: {
		why: "reaches Obsidian's own app: every note, every plugin and every setting",
		instead: "a query or a command; data reaches a widget only through its ports",
	},
	webview: {
		why: "drives a webview, which only the browser's guarded requests may do",
		instead: null,
	},
};

export const REFUSED_GLOBALS: ReadonlyMap<string, ReachKind> = new Map<string, ReachKind>([
	["window", "window"],
	["self", "window"],
	["top", "window"],
	["parent", "window"],
	["frames", "window"],
	["opener", "window"],
	["globalThis", "window"],
	["global", "window"],
	["activeWindow", "window"],
	["document", "page"],
	["activeDocument", "page"],
	["localStorage", "storage"],
	["sessionStorage", "storage"],
	["indexedDB", "storage"],
	["app", "obsidian"],
	["process", "node"],
	["require", "node"],
	["eval", "text-as-code"],
	["Function", "text-as-code"],
]);

export const REFUSED_PROPERTIES: ReadonlyMap<string, ReachKind> = new Map<string, ReachKind>([
	["window", "window"],
	["globalThis", "window"],
	["localStorage", "storage"],
	["sessionStorage", "storage"],
	["indexedDB", "storage"],
	["ownerDocument", "climb"],
	["defaultView", "climb"],
	["getRootNode", "climb"],
	["composedPath", "climb"],
	["contentWindow", "frame"],
	["contentDocument", "frame"],
	["constructor", "text-as-code"],
	["__proto__", "text-as-code"],
	["executeJavaScript", "webview"],
	["capturePage", "webview"],
	["loadURL", "webview"],
	["getWebContentsId", "webview"],
	["insertCSS", "webview"],
	["openDevTools", "webview"],
	["webContents", "webview"],
]);

export const TIMERS_TAKING_TEXT: readonly string[] = ["setTimeout", "setInterval", "setImmediate", "execScript"];

export const WEBVIEW_SELECTOR = /webview|data-browser-page/i;
