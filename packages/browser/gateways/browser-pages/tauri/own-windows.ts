import type { OwnWindowEvent, PagesBridge } from "./pages-bridge.js";

export class OwnWindows {
	private readonly pages = new Set<string>();

	constructor(
		private readonly bridge: PagesBridge,
		private readonly changed: () => void,
	) {}

	has(tabId: string): boolean {
		return this.pages.has(tabId);
	}

	open(tabId: string, title: string, created: Promise<void>): void {
		void created
			.then(() => this.bridge.openInOwnWindow(tabId, title))
			.catch((failure: unknown) => {
				console.error(`[widgetarium] the browser page ${tabId} could not open in its own window`, failure);
			});
	}

	tearOff(tabId: string, title: string, created: Promise<void>): void {
		void created
			.then(() => this.bridge.openOwnWindowAtCursor(tabId, title))
			.then((isOpened) => logTearOff(tabId, isOpened))
			.catch((failure: unknown) => {
				console.error(`[widgetarium] the browser page ${tabId} could not be torn off into its own window`, failure);
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

	forget(tabId: string): void {
		if (!this.pages.delete(tabId)) {
			return;
		}

		console.info(`[widgetarium] browser page ${tabId} own window → none (the page closed)`);
		this.changed();
	}

	applyEvent(event: OwnWindowEvent): void {
		if (event.kind === "own-window-closed" && !this.pages.has(event.page)) {
			return;
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
	}
}

function logTearOff(tabId: string, isOpened: boolean): void {
	if (!isOpened) {
		console.info(`[widgetarium] browser page ${tabId} studio → studio (the drag ended inside the studio window)`);
		return;
	}

	console.info(`[widgetarium] browser page ${tabId} studio → own window (the drag ended outside the studio)`);
}
