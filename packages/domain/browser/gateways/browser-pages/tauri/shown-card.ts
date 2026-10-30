import { createAttachment, stopAttachment } from "./page-attachment.js";
import type { Attached } from "./page-attachment.js";
import type { PagePlacement, PagesBridge } from "./pages-bridge.js";

interface ShownCardPorts {
	readonly bridge: PagesBridge;
	readonly drawnPage: () => string | null;
	readonly placeAt: (placement: PagePlacement) => void;
	readonly sync: () => void;
	readonly checkInPageNavigation: () => void;
}

export class ShownCard {
	private attached: Attached | null = null;

	constructor(private readonly ports: ShownCardPorts) {}

	current(): Attached | null {
		return this.attached;
	}

	attachIfNew(into: HTMLElement): boolean {
		if (this.attached?.container === into) {
			return false;
		}

		this.stop();
		this.attached = createAttachment({
			...this.ports,
			container: into,
		});
		return true;
	}

	detachIfCurrent(from: HTMLElement): boolean {
		if (this.attached?.container !== from) {
			return false;
		}

		this.stop();
		return true;
	}

	private stop(): void {
		if (this.attached === null) {
			return;
		}

		stopAttachment(this.attached);
		this.attached = null;
	}
}
