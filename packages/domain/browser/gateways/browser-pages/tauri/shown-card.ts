import { stopAttachment } from "./page-attachment.js";
import type { Attached } from "./page-attachment.js";
import { PageCover } from "./page-cover.js";
import { PagePlacementWatch } from "./page-placement.js";
import type { PagePlacement, PagesBridge } from "./pages-bridge.js";

export interface ShownCardHold {
	readonly bridge: PagesBridge;
	readonly drawnPage: () => string | null;
	readonly place: (placement: PagePlacement) => void;
	readonly sync: () => void;
	readonly checkInPageNavigation: () => void;
	readonly stopped: () => void;
}

const IN_PAGE_CHECK_MS = 1000;

export class ShownCard {
	private attached: Attached | null = null;

	constructor(private readonly hold: ShownCardHold) {}

	current(): Attached | null {
		return this.attached;
	}

	attach(into: HTMLElement): boolean {
		if (this.attached?.container === into) {
			return false;
		}

		this.stop();
		this.attached = this.attachedTo(into);
		return true;
	}

	detach(from: HTMLElement): boolean {
		if (this.attached?.container !== from) {
			return false;
		}

		this.stop();
		return true;
	}

	private attachedTo(container: HTMLElement): Attached {
		return {
			container,
			placement: new PagePlacementWatch(container, this.hold.place, this.hold.sync),
			cover: new PageCover({ container, bridge: this.hold.bridge, drawnPage: this.hold.drawnPage }),
			inPageCheck: setInterval(this.hold.checkInPageNavigation, IN_PAGE_CHECK_MS),
		};
	}

	private stop(): void {
		const attached = this.attached;

		if (attached === null) {
			return;
		}

		stopAttachment(attached);
		this.hold.stopped();
		this.attached = null;
	}
}
