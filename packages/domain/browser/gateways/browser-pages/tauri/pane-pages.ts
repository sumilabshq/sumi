import { createAttachment, followCover, frameIn, stopAttachment } from "./page-attachment.js";
import type { Attached } from "./page-attachment.js";
import type { PageFrame, PagePlacement, PagesBridge } from "./pages-bridge.js";

interface PanePagesPorts {
	readonly bridge: PagesBridge;
	readonly drawnIn: (attached: Attached | null, tabId: string) => string | null;
	readonly placeTab: (tabId: string, placement: PagePlacement) => void;
	readonly sync: () => void;
}

export class PanePages {
	private readonly held = new Map<string, Attached>();

	constructor(private readonly ports: PanePagesPorts) {}

	has(tabId: string): boolean {
		return this.held.has(tabId);
	}

	attachIfNew(tabId: string, into: HTMLElement): boolean {
		if (this.held.get(tabId)?.container === into) {
			return false;
		}

		this.drop(tabId);
		this.held.set(tabId, this.attachmentOf(tabId, into));
		return true;
	}

	detachIfCurrent(tabId: string, from: HTMLElement): boolean {
		if (this.held.get(tabId)?.container !== from) {
			return false;
		}

		this.drop(tabId);
		return true;
	}

	drawnIds(): readonly string[] {
		return [...this.held.keys()].filter((tabId) => this.drawnOf(tabId) !== null);
	}

	containerOf(tabId: string): HTMLElement | null {
		return this.held.get(tabId)?.container ?? null;
	}

	drawnOf(tabId: string): string | null {
		return this.ports.drawnIn(this.held.get(tabId) ?? null, tabId);
	}

	followCovers(): void {
		for (const [tabId, held] of this.held) {
			followCover(held, this.drawnOf(tabId) !== null);
		}
	}

	frames(): readonly PageFrame[] {
		return [...this.held].flatMap(([tabId, held]) => (this.drawnOf(tabId) === null ? [] : frameIn(held, tabId)));
	}

	private attachmentOf(tabId: string, container: HTMLElement): Attached {
		return createAttachment({
			container,
			bridge: this.ports.bridge,
			placeAt: (placement) => this.ports.placeTab(tabId, placement),
			sync: this.ports.sync,
			drawnPage: () => this.drawnOf(tabId),
			checkInPageNavigation: null,
		});
	}

	private drop(tabId: string): void {
		const held = this.held.get(tabId);

		if (held === undefined) {
			return;
		}

		stopAttachment(held);
		this.held.delete(tabId);
	}
}
