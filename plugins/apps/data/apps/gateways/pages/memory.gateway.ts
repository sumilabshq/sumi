import type { AppPage } from "../../shared/schema/page.schema.js";
import { PagesGateway } from "./pages.gateway.js";

const EMPTY_PAGE: AppPage = {
	actions: [],
	presses: [],
};

export class MemoryPagesGateway extends PagesGateway {
	private readonly pages = new Map<string, AppPage>();
	private minted = 0;

	override page(tabId: string): AppPage {
		return this.pages.get(tabId) ?? EMPTY_PAGE;
	}

	override savePage(tabId: string, page: AppPage): void {
		this.pages.set(tabId, page);
	}

	override mintedPresses(): number {
		return this.minted;
	}

	override savePressesMinted(minted: number): void {
		this.minted = minted;
	}
}
