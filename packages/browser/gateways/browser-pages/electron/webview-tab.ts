import { isObject } from "@widgetarium/core/engine/is-object.js";
import type { BrowserTab } from "../../../shared/schema/browser-tab.schema.js";
import type { CommittedPage, PageContent, PageRegion, PageShot } from "../../../shared/schema/page-read.schema.js";
import type { ElectronRemote } from "./electron-remote.js";
import { regionWithin } from "../../../shared/lib/region-within.js";
import { FIND_SECRET_FIELD, READ_PAGE } from "./page-scripts.js";
import { createPageView, fieldOfEvent, isCapturedImage } from "./page-view.js";
import type { PageView } from "./page-view.js";

const NEW_TAB_TITLE = "New tab";
const SETTLE_AT_MOST_MS = 20_000;
const NO_PAGE = "the tab holds no page yet";
const NOT_ON_SCREEN = "the tab is not on screen, so it holds no page to read";
const UNREADABLE = "the page answered something that is not its content";
const OUTSIDE_THE_PAGE = "the asked region lies outside the page on screen";
const PAGE_SCHEMES = /^(https?:|about:blank)/;
const PNG_PREFIX = /^data:image\/png;base64,/;

export class WebviewTab {
	private view: PageView | null = null;
	private isReady = false;
	private container: HTMLElement | null = null;
	private entry = 0;
	private settledWaiters: (() => void)[] = [];
	private state: BrowserTab;

	constructor(
		id: string,
		private readonly remote: ElectronRemote,
		private readonly partition: string,
		private readonly changed: () => void,
	) {
		this.state = {
			id,
			url: "",
			title: NEW_TAB_TITLE,
			favicon: null,
			isLoading: false,
			canGoBack: false,
			canGoForward: false,
		};
	}

	now(): BrowserTab {
		return this.state;
	}

	mountIn(container: HTMLElement): void {
		this.container = container;

		if (this.state.url !== "") {
			this.createView(this.state.url);
		}
	}

	unmount(): void {
		this.view?.remove();
		this.view = null;
		this.isReady = false;
		this.container = null;
	}

	setShown(isShown: boolean): void {
		this.view?.toggleAttribute("hidden", !isShown);
	}

	open(url: string): void {
		this.update({ url });

		if (this.view && this.isReady) {
			this.update({ isLoading: true });
			void this.view.loadURL(url).catch(() => undefined);
			return;
		}

		if (this.container) {
			this.view?.remove();
			this.createView(url);
			this.update({ isLoading: true });
		}
	}

	back(): void {
		this.readyView()?.goBack();
	}

	forward(): void {
		this.readyView()?.goForward();
	}

	reload(): void {
		this.readyView()?.reload();
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
		const view = this.readyView();

		return view
			? {
					url: view.getURL(),
					entry: this.entry,
				}
			: null;
	}

	async frameUrls(): Promise<readonly string[]> {
		return this.contents()
			.frames()
			.map((frame) => frame.url);
	}

	async hasSecretField(): Promise<boolean> {
		const answers = await Promise.all(
			this.contents()
				.frames()
				.map((frame) => frame.run(FIND_SECRET_FIELD)),
		);
		const inMainFrame = await this.contents().runIsolated(FIND_SECRET_FIELD);

		return inMainFrame === true || answers.some((answer) => answer === true);
	}

	async content(): Promise<PageContent> {
		const read: unknown = await this.contents().runIsolated(READ_PAGE);

		if (!isObject(read)) {
			throw new Error(UNREADABLE);
		}

		return {
			url: this.committed()?.url ?? "",
			title: String(read["title"] ?? ""),
			text: String(read["text"] ?? ""),
			html: String(read["html"] ?? ""),
		};
	}

	async capture(region: PageRegion | null): Promise<PageShot> {
		const view = this.onScreenView();
		const image: unknown = await view.capturePage(this.clampedRegion(view, region));

		if (!isCapturedImage(image)) {
			throw new Error(UNREADABLE);
		}

		const { width, height } = image.getSize();

		return {
			url: this.committed()?.url ?? "",
			png: image.toDataURL().replace(PNG_PREFIX, ""),
			width,
			height,
		};
	}

	private clampedRegion(view: PageView, region: PageRegion | null): PageRegion | undefined {
		if (region === null) {
			return undefined;
		}

		const clamped = regionWithin(region, {
			width: view.clientWidth,
			height: view.clientHeight,
		});

		if (clamped === null) {
			throw new Error(OUTSIDE_THE_PAGE);
		}

		return clamped;
	}

	private contents() {
		return this.remote.contentsOf(this.onScreenView().getWebContentsId());
	}

	private onScreenView(): PageView {
		const view = this.readyView();

		if (!view) {
			throw new Error(this.state.url === "" ? NO_PAGE : NOT_ON_SCREEN);
		}

		return view;
	}

	private readyView(): PageView | null {
		return this.isReady ? this.view : null;
	}

	private createView(url: string): void {
		const view = createPageView(url, this.partition);
		this.view = view;
		this.isReady = false;
		this.listenTo(view);
		this.container?.append(view);
	}

	private listenTo(view: PageView): void {
		view.addEventListener("dom-ready", () => {
			this.isReady = true;
			this.syncFrom(view);
		});
		view.addEventListener("did-start-loading", () => this.update({ isLoading: true }));
		view.addEventListener("did-stop-loading", () => this.finishLoading(view));
		view.addEventListener("did-navigate", () => this.noteNavigation(view));
		view.addEventListener("did-navigate-in-page", (event) => this.noteInPageNavigation(view, event));
		view.addEventListener("did-start-navigation", (event) => this.refuseOtherSchemes(view, event));
		view.addEventListener("page-title-updated", (event) =>
			this.update({ title: String(fieldOfEvent(event, "title")) }),
		);
		view.addEventListener("page-favicon-updated", (event) => this.noteFavicon(event));
	}

	private finishLoading(view: PageView): void {
		this.syncFrom(view);
		this.update({ isLoading: false });

		for (const settledWaiter of this.settledWaiters.splice(0)) {
			settledWaiter();
		}
	}

	private noteNavigation(view: PageView): void {
		this.entry += 1;
		this.syncFrom(view);
	}

	private noteInPageNavigation(view: PageView, event: Event): void {
		if (fieldOfEvent(event, "isMainFrame") !== true) {
			return;
		}

		this.noteNavigation(view);
	}

	private refuseOtherSchemes(view: PageView, event: Event): void {
		const url = String(fieldOfEvent(event, "url"));

		if (fieldOfEvent(event, "isMainFrame") !== true || PAGE_SCHEMES.test(url)) {
			return;
		}

		view.stop();
	}

	private noteFavicon(event: Event): void {
		const favicons: unknown = fieldOfEvent(event, "favicons");
		const first: unknown = Array.isArray(favicons) ? favicons[0] : null;

		this.update({ favicon: typeof first === "string" ? first : null });
	}

	private syncFrom(view: PageView): void {
		if (!this.isReady) {
			return;
		}

		this.update({
			url: view.getURL(),
			title: view.getTitle() || this.state.title,
			canGoBack: view.canGoBack(),
			canGoForward: view.canGoForward(),
		});
	}

	private update(next: Partial<BrowserTab>): void {
		this.state = {
			...this.state,
			...next,
		};
		this.changed();
	}
}
