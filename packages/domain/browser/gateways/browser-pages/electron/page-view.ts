import { isObject } from "@widgetarium/framework/is-object";

export interface PageRect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

export interface CapturedImage {
	toDataURL(): string;
	getSize(): { readonly width: number; readonly height: number };
}

export interface PageView extends HTMLElement {
	loadURL(url: string): Promise<void>;
	getURL(): string;
	getTitle(): string;
	canGoBack(): boolean;
	canGoForward(): boolean;
	goBack(): void;
	goForward(): void;
	reload(): void;
	stop(): void;
	getWebContentsId(): number;
	capturePage(rect?: PageRect): Promise<unknown>;
}

const PAGE_VIEW_METHODS = [
	"loadURL",
	"getURL",
	"getTitle",
	"canGoBack",
	"canGoForward",
	"goBack",
	"goForward",
	"reload",
	"stop",
	"getWebContentsId",
	"capturePage",
] as const;

const WEB_PREFERENCES = "contextIsolation=yes, sandbox=yes, nodeIntegration=no, nodeIntegrationInSubFrames=no";
const NOT_A_WEBVIEW = "this window draws no <webview>, so the browser cannot open pages here";

export function createPageView(src: string, partition: string): PageView {
	const view = document.createElement("webview");

	if (!isPageView(view)) {
		throw new Error(NOT_A_WEBVIEW);
	}

	view.setAttribute("partition", partition);
	view.setAttribute("webpreferences", WEB_PREFERENCES);
	view.setAttribute("src", src);
	view.className = "cv:absolute cv:inset-0 cv:size-full cv:border-0";
	view.dataset["browserPage"] = "";
	return view;
}

export function isCapturedImage(value: unknown): value is CapturedImage {
	return isObject(value) && typeof value["toDataURL"] === "function" && typeof value["getSize"] === "function";
}

export function fieldOfEvent(event: Event, field: string): unknown {
	return Reflect.get(event, field);
}

function isPageView(element: HTMLElement): element is PageView {
	return PAGE_VIEW_METHODS.every((name) => typeof Reflect.get(element, name) === "function");
}
