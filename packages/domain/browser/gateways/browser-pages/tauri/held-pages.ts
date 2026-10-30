import type { PagesBridge } from "./pages-bridge.js";
import { TauriPage } from "./tauri-page.js";

export interface HeldPagesHold {
	readonly bridge: PagesBridge;
	readonly profileId: string;
	readonly ownLabel: string;
	readonly shownId: () => string | null;
	readonly changed: () => void;
}

const NO_TAB = 'the browser holds no tab "{tabId}"';

export class HeldPages {
	private held: readonly TauriPage[] = [];
	private readonly closedHere = new Set<string>();

	constructor(private readonly hold: HeldPagesHold) {}

	all(): readonly TauriPage[] {
		return this.held;
	}

	create(tabId: string): void {
		if (this.heldPageOf(tabId) !== undefined) {
			return;
		}

		const page = new TauriPage({
			id: tabId,
			bridge: this.hold.bridge,
			profileId: this.hold.profileId,
			changed: () => this.hold.changed(),
		});
		this.becomeHeld([...this.held, page], `open ${tabId}`);
	}

	close(tabId: string, beforeDropped: () => void): void {
		const page = this.heldPageOf(tabId);

		if (!page) {
			return;
		}

		this.closedHere.add(tabId);
		page.destroy();
		beforeDropped();
		this.becomeHeld(
			this.held.filter((held) => held !== page),
			`close ${tabId}`,
		);
	}

	adoptStanding(pages: readonly string[]): Promise<void[]> {
		if (pages.length > 0) {
			console.info(
				`[widgetarium] browser pages in ${this.hold.ownLabel}: adopting ${pages.join(", ")} (they already stand in Rust)`,
			);
		}

		return Promise.all(
			pages.map((page) => {
				this.create(page);
				return this.pageOf(page).adopt();
			}),
		);
	}

	adoptIfUnknown(page: string): void {
		if (this.heldPageOf(page) !== undefined || this.closedHere.has(page)) {
			return;
		}

		console.info(
			`[widgetarium] browser page ${page} unknown in ${this.hold.ownLabel} → adopted (another studio window made it)`,
		);
		this.create(page);
		void this.pageOf(page).adopt();
	}

	leaveWindow(window: string): void {
		console.info(`[widgetarium] studio window ${window} → closed, its browser pages stand in no window`);

		for (const page of this.held) {
			page.leaveWindow(window);
		}
	}

	pageOf(tabId: string): TauriPage {
		const found = this.heldPageOf(tabId);

		if (!found) {
			throw new Error(NO_TAB.replace("{tabId}", tabId));
		}

		return found;
	}

	heldPageOf(tabId: string): TauriPage | undefined {
		return this.held.find((page) => page.now().id === tabId);
	}

	private becomeHeld(next: readonly TauriPage[], reason: string): void {
		console.info(
			`[widgetarium] browser pages ${this.held.length} → ${next.length}, shown ${this.hold.shownId()} (${reason})`,
		);
		this.held = next;
		this.hold.changed();
	}
}
