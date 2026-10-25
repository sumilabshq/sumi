import type { PageLook } from "../../../shared/schema/page-look.schema.js";
import { pageFillOf, stripColourOf } from "../../../shared/lib/page-fill.js";
import { PageColoursReadSchema, READ_PAGE_COLOURS } from "./page-look-script.js";
import type { PagesBridge } from "./pages-bridge.js";

export interface PageLooksHold {
	readonly bridge: PagesBridge;
	readonly drawnPages: () => readonly string[];
}

const LOOK_EVERY_MS = 1000;
const STRIP_PX = 2;
const STRIP_POINTS: readonly number[] = [0.25, 0.5, 0.75];

export class PageLooks {
	private readonly looks = new Map<string, PageLook>();
	private readonly watchers = new Set<() => void>();
	private timer: ReturnType<typeof setTimeout> | null = null;
	private pollTurn = 0;
	private isReading = false;
	private readonly bridge: PagesBridge;
	private readonly drawnPages: () => readonly string[];

	constructor({ bridge, drawnPages }: PageLooksHold) {
		this.bridge = bridge;
		this.drawnPages = drawnPages;
	}

	start(): void {
		if (this.timer !== null) {
			return;
		}

		// TRADE-OFF: polled, not pushed: a scroll listener in the page needs a WebKit message handler the host does not register yet
		this.rereadIn(0);
	}

	private rereadIn(ms: number): void {
		const turn = this.pollTurn;
		this.timer = setTimeout(async () => {
			await this.reread();

			if (turn === this.pollTurn) {
				this.rereadIn(LOOK_EVERY_MS);
			}
		}, ms);
	}

	stop(): void {
		if (this.timer !== null) {
			clearTimeout(this.timer);
		}

		this.pollTurn += 1;
		this.timer = null;
	}

	lookOf(page: string): PageLook | null {
		return this.looks.get(page) ?? null;
	}

	watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => this.watchers.delete(changed);
	}

	forget(page: string): void {
		this.looks.delete(page);
	}

	readonly reread = async (): Promise<void> => {
		const pages = this.drawnPages();

		if (pages.length === 0 || this.isReading) {
			return;
		}

		this.isReading = true;

		try {
			await Promise.all(pages.map((page) => this.readLookOrSay(page)));
		} finally {
			this.isReading = false;
		}
	};

	private async readLookOrSay(page: string): Promise<void> {
		try {
			await this.readLook(page);
		} catch (failure: unknown) {
			console.debug(`[widgetarium] browser page ${page} gave no colours`, failure);
		}
	}

	private async readLook(page: string): Promise<void> {
		const colours = PageColoursReadSchema.parse(JSON.parse(await this.bridge.evaluate(page, READ_PAGE_COLOURS)));
		const strip = colours.theme === null ? await this.stripColour(page, colours.width) : null;
		this.keep(page, {
			fill: pageFillOf(colours, strip),
		});
	}

	private async stripColour(page: string, width: number): Promise<string | null> {
		const png = await this.bridge.snapshot(page, { x: 0, y: 0, width, height: STRIP_PX }, "png");
		const picture = await createImageBitmap(new Blob([png.slice()], { type: "image/png" }));
		const canvas = new OffscreenCanvas(picture.width, picture.height);
		const paint = canvas.getContext("2d");

		if (paint === null) {
			return null;
		}

		paint.drawImage(picture, 0, 0);
		const samples = STRIP_POINTS.map((share) => [
			...paint.getImageData(Math.floor((picture.width - 1) * share), 0, 1, 1).data,
		]);
		return stripColourOf(samples);
	}

	private keep(page: string, look: PageLook): void {
		const was = this.looks.get(page);

		if (was?.fill === look.fill) {
			return;
		}

		console.info(`[widgetarium] browser page ${page} look ${was?.fill ?? "none"} → ${look.fill}`);
		this.looks.set(page, look);
		this.watchers.forEach((changed) => changed());
	}
}
