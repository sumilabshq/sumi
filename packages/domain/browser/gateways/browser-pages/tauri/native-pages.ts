import { followCover, frameIn } from "./page-attachment.js";
import type { Attached } from "./page-attachment.js";
import type { PageLooks } from "./page-looks.js";
import type { PageFrame, PagesBridge } from "./pages-bridge.js";
import type { PanePages } from "./pane-pages.js";

interface NativePagesPorts {
	readonly bridge: PagesBridge;
	readonly inPanes: PanePages;
	readonly looks: PageLooks;
	readonly attached: () => Attached | null;
}

export class NativePages {
	private shownKey: string | null = null;

	constructor(private readonly ports: NativePagesPorts) {}

	follow(drawn: string | null): void {
		this.followCovers(drawn);
		this.followLooks(drawn !== null);
		const frames = this.framesOf(drawn);
		const nextKey = frames.map((frame) => frame.page).join(" ");

		if (nextKey === this.shownKey) {
			return;
		}

		console.info(`[widgetarium] browser native pages [${this.shownKey ?? "unknown after a start"}] → [${nextKey}]`);
		this.shownKey = nextKey;
		void this.ports.bridge.show(frames).catch((failure: unknown) => {
			console.error("[widgetarium] the browser could not show its page", failure);
		});
	}

	private followCovers(drawn: string | null): void {
		followCover(this.ports.attached(), drawn !== null);
		this.ports.inPanes.followCovers();
	}

	private framesOf(drawn: string | null): readonly PageFrame[] {
		const main = drawn === null ? [] : frameIn(this.ports.attached(), drawn);
		return [...main, ...this.ports.inPanes.frames()];
	}

	private followLooks(isDrawn: boolean): void {
		if (isDrawn) {
			this.ports.looks.start();
			return;
		}

		this.ports.looks.stop();
	}
}
