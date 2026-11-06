import { isObject } from "@widgetarium/framework/is-object";
import { hostObject } from "@widgetarium/framework";
import type { PageArea, WebPage } from "../schema/web-page.schema.js";

export interface NativeWebPages {
	page(tab: string): Promise<WebPage | null>;
	pageArea(tab: string): PageArea | null;
	openPage(tab: string, url: string, profileId: string): Promise<void>;
	placePage(tab: string, area: PageArea | null): Promise<void>;
	goBackPage(tab: string): Promise<void>;
	goForwardPage(tab: string): Promise<void>;
	reloadPage(tab: string): Promise<void>;
	closePage(tab: string): Promise<void>;
	pagesChanged(changed: () => void): () => void;
}

const NATIVE_WEB_PAGES_METHODS = {
	page: true,
	pageArea: true,
	openPage: true,
	placePage: true,
	goBackPage: true,
	goForwardPage: true,
	reloadPage: true,
	closePage: true,
	pagesChanged: true,
} as const satisfies Record<keyof NativeWebPages, true>;

export const NativeWebPagesHost = hostObject<NativeWebPages>("NativeWebPages", isNativeWebPages);

function isNativeWebPages(held: unknown): held is NativeWebPages {
	return isObject(held) && Object.keys(NATIVE_WEB_PAGES_METHODS).every((method) => typeof held[method] === "function");
}
