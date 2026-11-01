import { isObject } from "@widgetarium/core/engine/is-object.js";
import { hostObject } from "@widgetarium/core/requests";
import type { PageArea, WebPage } from "../schema/web-page.schema.js";

export interface NativeWebPages {
	page(tab: string): Promise<WebPage | null>;
	area(tab: string): PageArea | null;
	open(tab: string, url: string): Promise<void>;
	place(tab: string, area: PageArea | null): Promise<void>;
	back(tab: string): Promise<void>;
	forward(tab: string): Promise<void>;
	reload(tab: string): Promise<void>;
	close(tab: string): Promise<void>;
	pagesChanged(changed: () => void): () => void;
}

const METHODS: readonly string[] = [
	"page",
	"area",
	"open",
	"place",
	"back",
	"forward",
	"reload",
	"close",
	"pagesChanged",
];

export const NativeWebPagesHost = hostObject<NativeWebPages>("NativeWebPages", isNativeWebPages);

function isNativeWebPages(held: unknown): held is NativeWebPages {
	return isObject(held) && METHODS.every((method) => typeof held[method] === "function");
}
