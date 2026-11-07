import type { NativeWebPages } from "../../shared/host/native-web-pages.host.js";
import type { PageArea, WebPage } from "../../shared/schema/web-page.schema.js";

export abstract class WebPagesGateway implements NativeWebPages {
	abstract page(tab: string): Promise<WebPage | null>;
	abstract pageArea(tab: string): PageArea | null;
	abstract openPage(tab: string, url: string, profileId: string): Promise<void>;
	abstract placePage(tab: string, area: PageArea | null): Promise<void>;
	abstract goBackPage(tab: string): Promise<void>;
	abstract goForwardPage(tab: string): Promise<void>;
	abstract reloadPage(tab: string): Promise<void>;
	abstract closePage(tab: string): Promise<void>;
	abstract pagesChanged(changed: () => void): () => void;
}
