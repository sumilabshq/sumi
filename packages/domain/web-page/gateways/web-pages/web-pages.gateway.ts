import type { PageArea, WebPage } from "../../shared/schema/web-page.schema.js";

export abstract class WebPagesGateway {
	abstract page(tab: string): Promise<WebPage | null>;
	abstract pageArea(tab: string): PageArea | null;
	abstract openPage(tab: string, url: string): Promise<void>;
	abstract placePage(tab: string, area: PageArea | null): Promise<void>;
	abstract pageBack(tab: string): Promise<void>;
	abstract pageForward(tab: string): Promise<void>;
	abstract reloadPage(tab: string): Promise<void>;
	abstract closePage(tab: string): Promise<void>;
	abstract pagesChanged(changed: () => void): () => void;
}
