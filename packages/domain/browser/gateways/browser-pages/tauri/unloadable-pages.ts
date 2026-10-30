import type { DrawnPages } from "./drawn-pages.js";
import type { HeldPages } from "./held-pages.js";
import { busyReasonIn } from "./page-reads.js";
import { PageUnloader } from "./page-unloader.js";
import type { PagesBridge } from "./pages-bridge.js";

export interface UnloadablePagesHold {
	readonly heldPages: HeldPages;
	readonly drawn: DrawnPages;
	readonly bridge: PagesBridge;
	readonly isInOwnWindow: (tabId: string) => boolean;
	readonly ownLabel: string;
}

const BUSY_UNANSWERED = "the page did not answer";

export class UnloadablePages {
	private readonly unloader: PageUnloader;

	constructor(private readonly hold: UnloadablePagesHold) {
		this.unloader = new PageUnloader({
			livePages: () => this.livePagesOfWindow(),
			isShownAnywhere: (tabId) => this.isShownAnywhere(tabId),
			refuseUnload: (tabId) => this.refuseUnload(tabId),
			unload: (tabId) => this.unloadPage(tabId),
			now: () => Date.now(),
		});
	}

	start(): void {
		this.unloader.start();
	}

	wake(tabId: string): void {
		this.hold.heldPages.heldPageOf(tabId)?.wakeIfUnloaded();
	}

	private livePagesOfWindow(): readonly string[] {
		const { heldPages, ownLabel } = this.hold;
		return heldPages
			.pages()
			.filter((page) => page.isLive() && (page.now().window ?? ownLabel) === ownLabel)
			.map((page) => page.now().id);
	}

	private isShownAnywhere(tabId: string): boolean {
		return this.hold.drawn.isShownOrPaned(tabId) || this.hold.isInOwnWindow(tabId);
	}

	private async refuseUnload(tabId: string): Promise<string | null> {
		try {
			return await busyReasonIn(this.hold.bridge, tabId);
		} catch (failure: unknown) {
			console.error(`[widgetarium] browser page ${tabId} did not say whether it is busy`, failure);
			return BUSY_UNANSWERED;
		}
	}

	private unloadPage(tabId: string): boolean {
		const page = this.hold.heldPages.heldPageOf(tabId);

		if (page === undefined || this.isShownAnywhere(tabId) || !page.unload()) {
			return false;
		}

		this.hold.drawn.looks.forget(tabId);
		return true;
	}
}
