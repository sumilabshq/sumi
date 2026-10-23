import type { BrowserTab } from "../../../shared/schema/browser-tab.schema.js";
import type { CommittedPage, PageContentRead, PageRegion, PageShot } from "../../../shared/schema/page-read.schema.js";
import type { PageEvent, PageFacts, PagesBridge } from "./pages-bridge.js";
import { base64Of, contentOf, faviconOf, frameUrlsOf, hasSecretFieldIn, pngSizeOf } from "./page-reads.js";

const NEW_TAB_TITLE = "New tab";
const BLANK = "about:blank";
const SETTLE_AT_MOST_MS = 20_000;
const NO_PAGE = "the tab holds no page yet";

const BLANK_TAB: Omit<BrowserTab, "id"> = {
	url: "",
	title: NEW_TAB_TITLE,
	favicon: null,
	isLoading: false,
	canGoBack: false,
	canGoForward: false,
	failure: null,
};

export interface TauriPageHold {
	readonly id: string;
	readonly bridge: PagesBridge;
	readonly profileId: string;
	readonly changed: () => void;
}

export class TauriPage {
	private state: BrowserTab;
	private entry = 0;
	private created: Promise<void> | null = null;
	private settledWaiters: (() => void)[] = [];
	private readonly bridge: PagesBridge;
	private readonly profileId: string;
	private readonly changed: () => void;

	constructor({ id, bridge, profileId, changed }: TauriPageHold) {
		this.state = {
			id,
			...BLANK_TAB,
		};
		this.bridge = bridge;
		this.profileId = profileId;
		this.changed = changed;
	}

	now(): BrowserTab {
		return this.state;
	}

	isDrawn(): boolean {
		return this.created !== null && this.state.url !== "" && this.state.failure === null;
	}

	open(url: string): void {
		this.update({
			url,
			failure: null,
			isLoading: true,
		});
		void this.ensureCreated()
			.then(() => this.bridge.navigate(this.state.id, url))
			.catch((failure: unknown) => this.noteBridgeFailure("open", failure));
	}

	back(): void {
		this.whenCreated((page) => this.bridge.back(page));
	}

	forward(): void {
		this.whenCreated((page) => this.bridge.forward(page));
	}

	reload(): void {
		this.whenCreated((page) => this.bridge.reload(page));
	}

	showRefused(address: string): void {
		this.update({
			url: address,
			failure: {
				kind: "scheme",
				address,
				code: "",
			},
		});
	}

	dismissFailure(): void {
		if (this.state.failure?.kind === "scheme") {
			void this.refreshFacts({ failure: null });
			return;
		}

		this.whenCreated((page) => this.bridge.navigate(page, BLANK));
		this.update({
			...BLANK_TAB,
		});
	}

	destroy(): void {
		window.removeEventListener("online", this.reloadIfStillOffline);
		this.releaseSettledWaiters();
		this.whenCreated((page) => this.bridge.close(page));
	}

	settled(): Promise<void> {
		if (!this.state.isLoading) {
			return Promise.resolve();
		}

		return new Promise((resolve) => {
			const timer = setTimeout(resolve, SETTLE_AT_MOST_MS);
			this.settledWaiters.push(() => {
				clearTimeout(timer);
				resolve();
			});
		});
	}

	committed(): CommittedPage | null {
		if (this.created === null || this.state.url === "") {
			return null;
		}

		return {
			url: this.state.url,
			entry: this.entry,
		};
	}

	frameUrls(): Promise<readonly string[]> {
		return frameUrlsOf(this.bridge, this.readablePage());
	}

	hasSecretField(): Promise<boolean> {
		return hasSecretFieldIn(this.bridge, this.readablePage());
	}

	content(): Promise<PageContentRead> {
		return contentOf(this.bridge, this.readablePage());
	}

	async capture(region: PageRegion | null): Promise<PageShot> {
		const png = await this.bridge.snapshot(this.readablePage(), region, "png");

		return {
			url: this.state.url,
			png: base64Of(png),
			...pngSizeOf(png),
		};
	}

	apply(event: PageEvent): void {
		const reactions: Record<PageEvent["kind"], () => void> = {
			started: () => this.update({ isLoading: true }),
			committed: () => this.noteCommit(event.facts),
			finished: () => this.noteFinish(event.facts),
			title: () => this.noteFacts(event.facts),
			failed: () => this.noteFailure(event),
			stopped: () => this.noteStop(event.facts),
			"own-window-opened": () => this.noteFacts(event.facts),
			"own-window-closed": () => this.noteFacts(event.facts),
		};
		reactions[event.kind]();
	}

	noteFacts(facts: PageFacts): void {
		const url = this.urlOf(facts);

		if (this.state.failure === null && url !== this.state.url) {
			this.entry += 1;
		}

		this.update({
			url: this.state.failure === null ? url : this.state.url,
			title: facts.title || this.state.title,
			canGoBack: facts.canGoBack,
			canGoForward: facts.canGoForward,
		});
	}

	private urlOf(facts: PageFacts): string {
		return facts.url === BLANK ? this.state.url : facts.url;
	}

	private noteCommit(facts: PageFacts): void {
		this.entry += 1;
		this.update({
			failure: null,
			favicon: null,
			isLoading: true,
			url: this.urlOf(facts),
			title: facts.title || this.state.title,
			canGoBack: facts.canGoBack,
			canGoForward: facts.canGoForward,
		});
	}

	private noteFinish(facts: PageFacts): void {
		this.noteFacts(facts);
		this.update({ isLoading: false });
		this.releaseSettledWaiters();
		void faviconOf(this.bridge, this.state.id).then((favicon) => this.update({ favicon }));
	}

	private noteStop(facts: PageFacts): void {
		this.noteFacts(facts);
		this.update({ isLoading: false });
		this.releaseSettledWaiters();
	}

	private noteFailure(event: PageEvent): void {
		if (event.failure === null) {
			return;
		}

		this.update({
			url: event.failure.address || this.state.url,
			failure: event.failure,
			isLoading: false,
		});
		this.releaseSettledWaiters();

		if (event.failure.kind === "offline") {
			window.addEventListener("online", this.reloadIfStillOffline, { once: true });
		}
	}

	private readonly reloadIfStillOffline = (): void => {
		if (this.state.failure?.kind !== "offline") {
			return;
		}

		this.reload();
	};

	private async refreshFacts(next: Partial<BrowserTab>): Promise<void> {
		this.update(next);

		if (this.created === null) {
			return;
		}

		this.noteFacts(await this.bridge.facts(this.state.id));
	}

	private ensureCreated(): Promise<void> {
		this.created ??= this.bridge.create(this.state.id, this.profileId);
		return this.created;
	}

	private whenCreated(run: (page: string) => Promise<void>): void {
		if (this.created === null) {
			return;
		}

		const page = this.state.id;
		void this.created.then(() => run(page)).catch((failure: unknown) => this.noteBridgeFailure("step", failure));
	}

	private readablePage(): string {
		if (this.created === null || this.state.url === "") {
			throw new Error(NO_PAGE);
		}

		return this.state.id;
	}

	private noteBridgeFailure(what: string, failure: unknown): void {
		console.error(`[widgetarium] browser page ${this.state.id} ${what} failed`, failure);
		this.update({ isLoading: false });
		this.releaseSettledWaiters();
	}

	private releaseSettledWaiters(): void {
		for (const settledWaiter of this.settledWaiters.splice(0)) {
			settledWaiter();
		}
	}

	private update(next: Partial<BrowserTab>): void {
		this.state = {
			...this.state,
			...next,
		};
		this.changed();
	}
}
