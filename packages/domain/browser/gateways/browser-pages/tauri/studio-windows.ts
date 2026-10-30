import type { PagesBridge } from "./pages-bridge.js";

interface StudioWindowsPorts {
	readonly bridge: PagesBridge;
	readonly ownLabel: string;
	readonly windowOf: (tabId: string) => string | null;
}

export class StudioWindows {
	constructor(private readonly ports: StudioWindowsPorts) {}

	otherWindowHolding(tabId: string): string | null {
		const windowLabel = this.ports.windowOf(tabId);
		return windowLabel === null || windowLabel === this.ports.ownLabel ? null : windowLabel;
	}

	focusHolding(tabId: string, holdingWindow: string): void {
		console.info(
			`[widgetarium] browser page ${tabId} picked in ${this.ports.ownLabel} → ${holdingWindow} focused (it stands there)`,
		);
		this.bringForward(holdingWindow);
	}

	focus(windowLabel: string): void {
		console.info(
			`[widgetarium] studio window ${this.ports.ownLabel} → ${windowLabel} focused (it holds what was picked)`,
		);
		this.bringForward(windowLabel);
	}

	openChat(chatId: string): void {
		const opened = this.ports.bridge.openChatWindow(chatId, null).then((windowLabel) => {
			console.info(`[widgetarium] chat ${chatId} ${this.ports.ownLabel} → ${windowLabel} (torn off)`);
		});
		this.logFailure(opened, `chat ${chatId} could not open in a studio window of its own`);
	}

	tearOff(tabId: string, openWith: string): void {
		const opened = this.ports.bridge.openStudioWindow(openWith, null).then((windowLabel) => {
			console.info(
				`[widgetarium] browser page ${tabId} ${this.ports.ownLabel} → ${windowLabel} (torn off as tab ${openWith})`,
			);
		});
		this.logFailure(opened, `tab ${openWith} could not open in a studio window of its own`);
	}

	private bringForward(windowLabel: string): void {
		this.logFailure(this.ports.bridge.focusWindow(windowLabel), `studio window ${windowLabel} could not come forward`);
	}

	private logFailure(asked: Promise<void>, refusal: string): void {
		void asked.catch((failure: unknown) => {
			console.error(`[widgetarium] ${refusal}`, failure);
		});
	}
}
