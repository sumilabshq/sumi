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
