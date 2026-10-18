import type { BrowserTab } from "../../shared/schema/browser-tab.schema.js";
import type { CommittedPage, PageContentRead, PageRegion, PageShot } from "../../shared/schema/page-read.schema.js";

export abstract class BrowserPagesGateway {
	abstract isAvailable(): boolean;
	abstract tabs(): readonly BrowserTab[];
	abstract shownId(): string | null;
	abstract isOnScreen(): boolean;
	abstract watch(changed: () => void): () => void;
	abstract attach(into: HTMLElement): void;
	abstract detach(from: HTMLElement): void;
	abstract open(tabId: string, url: string): void;
	abstract show(tabId: string): void;
	abstract back(tabId: string): void;
	abstract forward(tabId: string): void;
	abstract reload(tabId: string): void;
	abstract showRefused(tabId: string, address: string): void;
	abstract dismissFailure(tabId: string): void;
	abstract settled(tabId: string): Promise<void>;
	abstract committed(tabId: string): CommittedPage | null;
	abstract frameUrls(tabId: string): Promise<readonly string[]>;
	abstract hasSecretField(tabId: string): Promise<boolean>;
	abstract content(tabId: string): Promise<PageContentRead>;
	abstract capture(tabId: string, region: PageRegion | null): Promise<PageShot>;
}
