import { frameIn } from "./page-attachment.js";
import type { Attached } from "./page-attachment.js";
import type { PageLooks } from "./page-looks.js";
import type { PageFrame, PagesBridge } from "./pages-bridge.js";
import type { PanePages } from "./pane-pages.js";

export interface NativePagesHold {
	readonly bridge: PagesBridge;
	readonly inPanes: PanePages;
	readonly looks: PageLooks;
	readonly attached: () => Attached | null;
}

export class NativePages {
	private shownKey: string | null = null;

	constructor(private readonly hold: NativePagesHold) {}

	follow(drawn: string | null): void {
		this.followCovers(drawn);
		this.followLooks(drawn !== null);
		const frames = this.framesNow(drawn);
		const shownKey = frames.map((frame) => frame.page).join(" ");

		if (shownKey === this.shownKey) {
			return;
		}

		console.info(`[widgetarium] browser native pages [${this.shownKey ?? "unknown after a start"}] → [${shownKey}]`);
		this.shownKey = shownKey;
		void this.hold.bridge.show(frames).catch((failure: unknown) => {
			console.error("[widgetarium] the browser could not show its page", failure);
		});
	}

	private followCovers(drawn: string | null): void {
		const attached = this.hold.attached();
		attached?.cover.follow(drawn !== null);
		attached?.cover.recheckSoon();
		this.hold.inPanes.followCovers();
	}

	private framesNow(drawn: string | null): readonly PageFrame[] {
		const main = drawn === null ? [] : frameIn(this.hold.attached(), drawn);
		return [...main, ...this.hold.inPanes.frames()];
	}

	private followLooks(isDrawn: boolean): void {
		if (isDrawn) {
			this.hold.looks.start();
			return;
		}

		this.hold.looks.stop();
	}
}
