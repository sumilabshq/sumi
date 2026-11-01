import type { PagesBridge } from "./pages-bridge.js";
import { TauriPage } from "./tauri-page.js";

interface HeldPagesPorts {
	readonly bridge: PagesBridge;
	readonly profileId: string;
	readonly changed: () => void;
}

const NO_TAB = 'the browser holds no tab "{tabId}"';

export class HeldPages {
	private held: readonly TauriPage[] = [];
	private readonly closedHere = new Set<string>();

	constructor(private readonly ports: HeldPagesPorts) {}

	pages(): readonly TauriPage[] {
		return this.held;
	}

	create(tabId: string, profileId: string | null): TauriPage {
		const known = this.heldPageOf(tabId);

		if (known !== undefined) {
			return known;
		}

		this.closedHere.delete(tabId);
		const page = new TauriPage({
			id: tabId,
			bridge: this.ports.bridge,
			profileId: profileId ?? this.ports.profileId,
			changed: this.ports.changed,
		});
		this.replaceHeld([...this.held, page], `open ${tabId}`);
		return page;
	}

	destroy(tabId: string): TauriPage | undefined {
		const page = this.heldPageOf(tabId);

		if (page === undefined) {
			return undefined;
		}

		this.closedHere.add(tabId);
		page.destroy();
		return page;
	}

	drop(page: TauriPage): void {
		this.replaceHeld(
			this.held.filter((held) => held !== page),
			`close ${page.now().id}`,
		);
	}

	async adoptStanding(pages: readonly string[]): Promise<void> {
		if (pages.length > 0) {
			console.info(`[widgetarium] browser pages ${pages.join(", ")} → adopted (they already stand in Rust)`);
		}

		await Promise.all(pages.map((page) => this.adopt(page)));
	}

	adoptIfStanding(page: string): void {
		if (this.isKnown(page)) {
			return;
		}

		void this.adoptOnceStanding(page).catch((failure: unknown) => {
			console.error(`[widgetarium] browser page ${page} could not be adopted`, failure);
		});
	}

	leaveWindow(windowLabel: string): void {
		console.info(`[widgetarium] studio window ${windowLabel} → closed, its browser pages stand in no window`);

		for (const page of this.held) {
			page.leaveWindow(windowLabel);
		}
	}

	pageOf(tabId: string): TauriPage {
		const found = this.heldPageOf(tabId);

		if (found === undefined) {
			throw new Error(NO_TAB.replace("{tabId}", tabId));
		}

		return found;
	}

	heldPageOf(tabId: string): TauriPage | undefined {
		return this.held.find((page) => page.now().id === tabId);
	}

	private async adoptOnceStanding(page: string): Promise<void> {
		const standing = await this.ports.bridge.standingPages();

		if (this.isKnown(page)) {
			return;
		}

		if (!standing.includes(page)) {
			console.info(`[widgetarium] browser page ${page} unknown here → ignored (it stands nowhere, closed elsewhere)`);
			return;
		}

		console.info(`[widgetarium] browser page ${page} unknown here → adopted (another studio window made it)`);
		await this.adopt(page);
	}

	private adopt(page: string): Promise<void> {
		return this.create(page, null).adopt();
	}

	private isKnown(page: string): boolean {
		return this.heldPageOf(page) !== undefined || this.closedHere.has(page);
	}

	private replaceHeld(next: readonly TauriPage[], reason: string): void {
		console.info(`[widgetarium] browser pages ${this.held.length} → ${next.length} (${reason})`);
		this.held = next;
		this.ports.changed();
	}
}
