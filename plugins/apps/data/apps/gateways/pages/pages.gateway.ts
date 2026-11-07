import type { AppPage } from "../../shared/schema/page.schema.js";

export abstract class PagesGateway {
	abstract page(tabId: string): AppPage;
	abstract savePage(tabId: string, page: AppPage, reason: string): void;
	abstract mintedPresses(): number;
	abstract savePressesMinted(minted: number): void;
}
