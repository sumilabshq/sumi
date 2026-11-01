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
		return this.nativePages.area(tab);
	}

	override openPage(tab: string, url: string): Promise<void> {
		return this.nativePages.open(tab, url);
	}

	override placePage(tab: string, area: PageArea | null): Promise<void> {
		return this.nativePages.place(tab, area);
	}

	override pageBack(tab: string): Promise<void> {
		return this.nativePages.back(tab);
	}

	override pageForward(tab: string): Promise<void> {
		return this.nativePages.forward(tab);
	}

	override reloadPage(tab: string): Promise<void> {
		return this.nativePages.reload(tab);
	}

	override closePage(tab: string): Promise<void> {
		return this.nativePages.close(tab);
	}

	override pagesChanged(changed: () => void): () => void {
		return this.nativePages.pagesChanged(changed);
	}
}
