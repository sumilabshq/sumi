import type { BrowserTab } from "../../shared/schema/browser-tab.schema.js";
import type { PageLook } from "../../shared/schema/page-look.schema.js";
import type {
	CommittedPage,
	PageContentRead,
	PageForm,
	PageShot,
	ShotAsk,
} from "../../shared/schema/page-read.schema.js";
import type { GhostLay, GhostWorn } from "../../shared/schema/tear-off-ghost.schema.js";
import type { TabWindowView } from "../../shared/schema/tab-window.schema.js";

export abstract class BrowserPagesGateway {
	abstract isAvailable(): boolean;
	abstract tabs(): readonly BrowserTab[];
	abstract shownId(): string | null;
	abstract isOnScreen(tabId: string): boolean;
	abstract pagesChanged(changed: () => void): () => void;
	abstract attach(into: HTMLElement): void;
	abstract detach(from: HTMLElement): void;
	abstract attachInPane(tabId: string, into: HTMLElement): void;
	abstract detachFromPane(tabId: string, from: HTMLElement): void;
	abstract canOpenOwnWindow(): boolean;
	abstract isInOwnWindow(tabId: string): boolean;
	abstract isPoppedOut(tabId: string): boolean;
	abstract openInOwnWindow(tabId: string): void;
	abstract focusOwnWindow(tabId: string): void;
	abstract focusStudioWindow(window: string): void;
	abstract openTabWindow(tabId: string, view: TabWindowView): void;
	abstract tearOff(tabId: string, openWith: string): void;
	abstract layTearOffGhost(lay: GhostLay): Promise<void>;
	abstract wearTearOffGhost(worn: GhostWorn): void;
	abstract showTearOffGhost(shown: boolean): void;
	abstract create(tabId: string, profileId: string | null): void;
	abstract close(tabId: string): void;
	abstract freeze(tabId: string): void;
	abstract thaw(tabId: string): void;
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
	abstract content(tabId: string, form: PageForm): Promise<PageContentRead>;
	abstract look(tabId: string): PageLook | null;
	abstract looksChanged(changed: () => void): () => void;
	abstract capture(tabId: string, ask: ShotAsk): Promise<PageShot>;
}
