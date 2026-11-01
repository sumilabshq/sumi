import type { NativeWebPages } from "../../shared/host/native-web-pages.host.js";
import type { PageArea, WebPage } from "../../shared/schema/web-page.schema.js";
import { WebPagesGateway } from "./web-pages.gateway.js";

export class NativeWebPagesGateway extends WebPagesGateway {
	constructor(private readonly nativePages: NativeWebPages) {
		super();
	}

	override page(tab: string): Promise<WebPage | null> {
		return this.nativePages.page(tab);
	}

	override pageArea(tab: string): PageArea | null {
		return this.nativePages.pageArea(tab);
	}

	override openPage(tab: string, url: string, profileId: string): Promise<void> {
		return this.nativePages.openPage(tab, url, profileId);
	}

	override placePage(tab: string, area: PageArea | null): Promise<void> {
		return this.nativePages.placePage(tab, area);
	}

	override goBackPage(tab: string): Promise<void> {
		return this.nativePages.goBackPage(tab);
	}

	override goForwardPage(tab: string): Promise<void> {
		return this.nativePages.goForwardPage(tab);
	}

	override reloadPage(tab: string): Promise<void> {
		return this.nativePages.reloadPage(tab);
	}

	override closePage(tab: string): Promise<void> {
		return this.nativePages.closePage(tab);
	}

	override pagesChanged(changed: () => void): () => void {
		return this.nativePages.pagesChanged(changed);
	}
}
