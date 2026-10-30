import type { PagesBridge } from "./pages-bridge.js";

export interface StudioWindowsHold {
	readonly bridge: PagesBridge;
	readonly ownLabel: string;
	readonly windowOf: (tabId: string) => string | null;
}

export class StudioWindows {
	constructor(private readonly hold: StudioWindowsHold) {}

	holding(tabId: string): string | null {
		const window = this.hold.windowOf(tabId);
		return window === null || window === this.hold.ownLabel ? null : window;
	}

	focusHolding(tabId: string, holding: string): void {
		console.info(
			`[widgetarium] browser page ${tabId} picked in ${this.hold.ownLabel} → ${holding} focused (it stands there)`,
		);
		this.bringForward(holding);
	}

	focus(window: string): void {
		console.info(`[widgetarium] studio window ${this.hold.ownLabel} → ${window} focused (it holds what was picked)`);
		this.bringForward(window);
	}

	openChat(chatId: string): void {
		void this.hold.bridge
			.openChatWindow(chatId, null)
			.then((window) => {
				console.info(`[widgetarium] chat ${chatId} ${this.hold.ownLabel} → ${window} (torn off)`);
			})
			.catch((failure: unknown) => {
				console.error(`[widgetarium] chat ${chatId} could not open in a studio window of its own`, failure);
			});
	}

	tearOff(tabId: string, openWith: string): void {
		void this.hold.bridge
			.openStudioWindow(openWith, null)
			.then((window) => {
				console.info(
					`[widgetarium] browser page ${tabId} ${this.hold.ownLabel} → ${window} (torn off as tab ${openWith})`,
				);
			})
			.catch((failure: unknown) => {
				console.error(`[widgetarium] tab ${openWith} could not open in a studio window of its own`, failure);
			});
	}

	private bringForward(window: string): void {
		void this.hold.bridge.focusWindow(window).catch((failure: unknown) => {
			console.error(`[widgetarium] studio window ${window} could not come forward`, failure);
		});
	}
}
