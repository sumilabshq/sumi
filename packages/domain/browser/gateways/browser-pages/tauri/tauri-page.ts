import type { BrowserTab } from "../../../shared/schema/browser-tab.schema.js";
import type {
	CommittedPage,
	PageContentRead,
	PageForm,
	PageShot,
	ShotAsk,
} from "../../../shared/schema/page-read.schema.js";
import { regionOnPage } from "../../../shared/lib/region-within.js";
import { originOf } from "../../../shared/lib/site-key.js";
import type { WornIcon } from "../../../shared/schema/site-icon.schema.js";
import type { PageFacts, PageLoadEvent, PagesBridge } from "./pages-bridge.js";
import { base64Of, contentOf, frameUrlsOf, hasSecretFieldIn, layoutOf, pngSizeOf } from "./page-reads.js";

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
	window: null,
};

const MOST_SHOT_CHARACTERS = 5_000_000;
const SHOT_TOO_HEAVY = "the shot weighs {mb} MB, over the 5 MB a model takes; ask for a smaller region";
export interface TauriPageHold {
	readonly id: string;
	readonly bridge: PagesBridge;
	readonly profileId: string;
	readonly changed: () => void;
}

export class TauriPage {
	private state: BrowserTab;
	private entry = 0;
	private faviconOrigin: string | null = null;
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

	content(form: PageForm): Promise<PageContentRead> {
		return contentOf(this.bridge, this.readablePage(), form);
	}

	async capture({ area, region }: ShotAsk): Promise<PageShot> {
		const page = this.readablePage();
		const layout = await layoutOf(this.bridge, page);
		const png =
			area === "page"
				? await this.bridge.pageShot(page, regionOnPage(region, layout.page))
				: await this.bridge.snapshot(page, region, "png");
		const encoded = base64Of(png);

		if (encoded.length > MOST_SHOT_CHARACTERS) {
			throw new Error(SHOT_TOO_HEAVY.replace("{mb}", (encoded.length / 1_000_000).toFixed(1)));
		}

		return {
			url: this.state.url,
			png: encoded,
			...pngSizeOf(png),
			layout,
		};
	}

	wearFavicon({ favicon, origin }: WornIcon): void {
		if (originOf(this.state.url) !== origin) {
			console.info(`[widgetarium] browser page ${this.state.id} icon of ${origin} skipped: the tab moved on`);
			return;
		}

		this.faviconOrigin = origin;

		if (favicon === this.state.favicon) {
			return;
		}

		this.update({ favicon });
	}

	apply(event: PageLoadEvent): void {
		const reactions: Record<PageLoadEvent["kind"], () => void> = {
			started: () => this.update({ isLoading: true }),
			committed: () => this.noteCommit(event.facts),
			finished: () => this.noteFinish(event.facts),
			title: () => this.noteFacts(event.facts),
			failed: () => this.noteFailure(event),
			stopped: () => this.noteStop(event.facts),
			moved: () => this.noteFacts(event.facts),
		};
		reactions[event.kind]();
	}

	checkInPageNavigation(): void {
		if (this.state.isLoading) {
			return;
		}

		void this.bridge
			.facts(this.state.id)
			.then((facts) => this.noteFacts(facts))
			.catch(() => undefined);
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
			window: facts.window,
		});
	}

	leaveWindow(window: string): void {
		if (this.state.window !== window) {
			return;
		}

		this.update({ window: null });
	}

	private urlOf(facts: PageFacts): string {
		return facts.url === BLANK ? this.state.url : facts.url;
	}

	private noteCommit(facts: PageFacts): void {
		this.entry += 1;
		const url = this.urlOf(facts);
		const origin = originOf(url);
		this.update({
			failure: null,
			favicon: origin !== null && origin === this.faviconOrigin ? this.state.favicon : null,
			isLoading: true,
			url,
			title: facts.title || this.state.title,
			canGoBack: facts.canGoBack,
			canGoForward: facts.canGoForward,
			window: facts.window,
		});
	}

	private noteFinish(facts: PageFacts): void {
		this.noteFacts(facts);
		this.update({ isLoading: false });
		this.releaseSettledWaiters();
	}

	private noteStop(facts: PageFacts): void {
		this.noteFacts(facts);
		this.update({ isLoading: false });
		this.releaseSettledWaiters();
	}

	private noteFailure(event: PageLoadEvent): void {
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

	adopt(): Promise<void> {
		this.created ??= Promise.resolve();
		return this.refreshFacts({});
	}

	ensureCreated(): Promise<void> {
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
		if (isHeldAlready(this.state, next)) {
			return;
		}

		this.state = {
			...this.state,
			...next,
		};
		this.changed();
	}
}

function isHeldAlready(state: BrowserTab, next: Partial<BrowserTab>): boolean {
	return Object.entries(next).every(([field, value]) => Object.is(Reflect.get(state, field), value));
}
