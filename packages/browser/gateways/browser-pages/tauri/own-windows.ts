import type { PageEvent, PagesBridge } from "./pages-bridge.js";

export class OwnWindows {
	private readonly pages = new Set<string>();

	constructor(
		private readonly bridge: PagesBridge,
		private readonly changed: () => void,
	) {}

	has(tabId: string): boolean {
		return this.pages.has(tabId);
	}

	open(tabId: string, title: string): void {
		void this.bridge.openInOwnWindow(tabId, title).catch((failure: unknown) => {
			console.error(`[widgetarium] the browser page ${tabId} could not open in its own window`, failure);
		});
	}

	focus(tabId: string): void {
		void this.bridge.focusOwnWindow(tabId).catch((failure: unknown) => {
			console.error(`[widgetarium] the window of browser page ${tabId} could not come forward`, failure);
		});
	}

	seed(pages: readonly string[]): void {
		if (pages.length === 0) {
			return;
		}

		console.info(`[widgetarium] browser pages ${pages.join(", ")} kept their own windows across the reload`);

		for (const page of pages) {
			this.pages.add(page);
		}

		this.changed();
	}

	applyEvent(event: PageEvent): boolean {
		if (event.kind !== "own-window-opened" && event.kind !== "own-window-closed") {
			return false;
		}

		console.info(
			`[widgetarium] browser page ${event.page} ${event.kind === "own-window-opened" ? "in its own window" : "back in the studio"}`,
		);

		if (event.kind === "own-window-opened") {
			this.pages.add(event.page);
		} else {
			this.pages.delete(event.page);
		}

		this.changed();
		return true;
	}
}
