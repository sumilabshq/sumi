import type { PageLook } from "../../../shared/schema/page-look.schema.js";
import type { PageRegion } from "../../../shared/schema/page-read.schema.js";
import { pageFillOf, wantsStrip } from "../../../shared/lib/page-fill.js";
import { PageColoursReadSchema, READ_PAGE_COLOURS } from "./page-look-script.js";
import type { PageColoursRead } from "./page-look-script.js";
import type { PagesBridge } from "./pages-bridge.js";

export interface PageLooksHold {
	readonly bridge: PagesBridge;
	readonly drawnPage: () => string | null;
	readonly stripWidth: () => number;
}

interface PageStrip {
	readonly url: string;
	readonly average: string;
	readonly readAt: string;
}

const STRIP_PX = 44;
const STRIP_FORMAT = "jpeg";
const STRIP_TYPE = "image/jpeg";
const SAMPLE_SIDE = 8;
const STRIP_LOOK_EVERY_MS = 250;
const FILL_LOOK_EVERY_MS = 1000;
const RGB_CHANNELS = [0, 1, 2];

export class PageLooks {
	private readonly looks = new Map<string, PageLook>();
	private readonly strips = new Map<string, PageStrip>();
	private readonly watchers = new Set<() => void>();
	private timer: ReturnType<typeof setTimeout> | null = null;
	private isStripShown = false;
	private pollTurn = 0;
	private isReading = false;
	private readonly bridge: PagesBridge;
	private readonly drawnPage: () => string | null;
	private readonly stripWidth: () => number;

	constructor({ bridge, drawnPage, stripWidth }: PageLooksHold) {
		this.bridge = bridge;
		this.drawnPage = drawnPage;
		this.stripWidth = stripWidth;
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
				this.rereadIn(this.isStripShown ? STRIP_LOOK_EVERY_MS : FILL_LOOK_EVERY_MS);
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
		this.dropStrip(page);
		this.looks.delete(page);
	}

	readonly reread = async (): Promise<void> => {
		const page = this.drawnPage();

		if (page === null || this.isReading) {
			return;
		}

		this.isReading = true;

		try {
			await this.readLook(page);
		} catch (failure: unknown) {
			console.debug(`[widgetarium] browser page ${page} gave no colours`, failure);
		} finally {
			this.isReading = false;
		}
	};

	private async readLook(page: string): Promise<void> {
		const colours = PageColoursReadSchema.parse(JSON.parse(await this.bridge.evaluate(page, READ_PAGE_COLOURS)));
		this.isStripShown = wantsStrip(colours);
		const strip = this.isStripShown ? await this.stripOf(page, colours) : this.dropStrip(page);
		this.keep(page, {
			fill: pageFillOf(colours, strip?.average ?? null),
			strip: strip?.url ?? null,
		});
	}

	private async stripOf(page: string, colours: PageColoursRead): Promise<PageStrip> {
		const readAt = `${colours.href} ${colours.scrollY}`;
		const held = this.strips.get(page);

		if (held?.readAt === readAt) {
			return held;
		}

		const strip = await this.snapshotStrip(page, readAt);
		this.dropStrip(page);
		this.strips.set(page, strip);
		return strip;
	}

	private async snapshotStrip(page: string, readAt: string): Promise<PageStrip> {
		const jpeg = await this.bridge.snapshot(page, stripRegionOf(this.stripWidth()), STRIP_FORMAT);
		const picture = new Blob([jpeg.slice()], { type: STRIP_TYPE });
		return {
			url: URL.createObjectURL(picture),
			average: await averageOf(picture),
			readAt,
		};
	}

	private dropStrip(page: string): null {
		const held = this.strips.get(page);

		if (held !== undefined) {
			URL.revokeObjectURL(held.url);
		}

		this.strips.delete(page);
		return null;
	}

	private keep(page: string, look: PageLook): void {
		const was = this.looks.get(page);

		if (was?.fill === look.fill && was.strip === look.strip) {
			return;
		}

		console.info(`[widgetarium] browser page ${page} look ${was?.fill ?? "none"} → ${look.fill}`);
		this.looks.set(page, look);
		this.watchers.forEach((changed) => changed());
	}
}

function stripRegionOf(width: number): PageRegion {
	return {
		x: 0,
		y: 0,
		width: Math.max(1, Math.round(width)),
		height: STRIP_PX,
	};
}

async function averageOf(picture: Blob): Promise<string> {
	return averageColourOf(await sampledPixelsOf(picture));
}

async function sampledPixelsOf(picture: Blob): Promise<Uint8ClampedArray> {
	const bitmap = await createImageBitmap(picture);
	const canvas = document.createElement("canvas");
	canvas.width = SAMPLE_SIDE;
	canvas.height = SAMPLE_SIDE;
	const paint = canvas.getContext("2d");
	paint?.drawImage(bitmap, 0, 0, SAMPLE_SIDE, SAMPLE_SIDE);
	bitmap.close();
	return paint?.getImageData(0, 0, SAMPLE_SIDE, SAMPLE_SIDE).data ?? new Uint8ClampedArray(4);
}

function averageColourOf(pixels: Uint8ClampedArray): string {
	const count = Math.max(1, pixels.length / 4);
	const [red, green, blue] = RGB_CHANNELS.map((channel) => Math.round(channelSumOf(pixels, channel) / count));
	return `rgb(${red ?? 0}, ${green ?? 0}, ${blue ?? 0})`;
}

function channelSumOf(pixels: Uint8ClampedArray, channel: number): number {
	let sum = 0;

	for (let at = channel; at < pixels.length; at += 4) {
		sum += pixels[at] ?? 0;
	}

	return sum;
}
