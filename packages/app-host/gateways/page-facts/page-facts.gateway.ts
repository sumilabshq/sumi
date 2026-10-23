import type { PageFacts } from "../../shared/schema/page-facts.schema.js";

export abstract class PageFactsGateway {
	abstract isAvailable(): boolean;
	abstract pages(): readonly PageFacts[];
	abstract watch(changed: () => void): () => void;
	abstract openPage(pageId: string): void;
	abstract closePage(pageId: string): void;
	abstract showPage(pageId: string): void;
	abstract openAddress(pageId: string, address: string): void;
	abstract reloadPage(pageId: string): void;
	abstract canOpenOwnWindow(): boolean;
	abstract openPageInOwnWindow(pageId: string): void;
	abstract focusPageWindow(pageId: string): void;
	abstract tearOffPage(pageId: string): void;
	abstract stop(): void;
}
