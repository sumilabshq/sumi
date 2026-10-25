import { PageCover } from "./page-cover.js";
import { frameIn, stopAttachment } from "./page-attachment.js";
import type { Attached } from "./page-attachment.js";
import { PagePlacementWatch } from "./page-placement.js";
import type { PageFrame, PagePlacement, PagesBridge } from "./pages-bridge.js";

export interface PanePagesAsk {
	readonly bridge: PagesBridge;
	readonly drawnIn: (attached: Attached | null, tabId: string) => string | null;
	readonly place: (tabId: string, placement: PagePlacement) => void;
	readonly sync: () => void;
}

export class PanePages {
	private readonly held = new Map<string, Attached>();

	constructor(private readonly ask: PanePagesAsk) {}

	has(tabId: string): boolean {
		return this.held.has(tabId);
	}

	attach(tabId: string, into: HTMLElement): boolean {
		if (this.held.get(tabId)?.container === into) {
			return false;
		}

		this.drop(tabId);
		this.held.set(tabId, this.attachmentOf(tabId, into));
		return true;
	}

	detach(tabId: string, from: HTMLElement): boolean {
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
		return this.ask.drawnIn(this.held.get(tabId) ?? null, tabId);
	}

	followCovers(): void {
		for (const [tabId, held] of this.held) {
			held.cover.follow(this.drawnOf(tabId) !== null);
			held.cover.recheckSoon();
		}
	}

	frames(): readonly PageFrame[] {
		return [...this.held].flatMap(([tabId, held]) => (this.drawnOf(tabId) === null ? [] : frameIn(held, tabId)));
	}

	private attachmentOf(tabId: string, container: HTMLElement): Attached {
		return {
			container,
			placement: new PagePlacementWatch(
				container,
				(placement) => this.ask.place(tabId, placement),
				() => this.ask.sync(),
			),
			cover: new PageCover({ container, bridge: this.ask.bridge, drawnPage: () => this.drawnOf(tabId) }),
			inPageCheck: null,
		};
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
