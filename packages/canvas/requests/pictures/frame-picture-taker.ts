import { msSinceMoved } from "@widgetarium/gpu";
import type { FramePicture, FramePictures, PictureAsk } from "../../schema/frame-picture.js";
import type { PictureTaker } from "../../schema/drawing.js";
import { framePictureOf, keepFramePicture } from "./picture-store.js";

interface Waiting {
	readonly key: string;
	readonly node: HTMLElement;
	readonly pictureOf: PictureTaker;
}

const SNAPSHOT_SCALE = 0.5;
const SETTLED_AFTER_MS = 400;
const STILL_FOR_MS = 1500;
const AT_ONCE = 1;

export abstract class FramePictureTaker {
	abstract now(): FramePictures;
	abstract isCurrent(frame: string, key: string): boolean;
	abstract watch(changed: () => void): () => void;
	abstract ask(asks: readonly PictureAsk[], pictureOf: PictureTaker): void;
}

export class QueuedFramePictures extends FramePictureTaker {
	private readonly shown = new Map<string, FramePicture>();
	private readonly waiting = new Map<string, Waiting>();
	private readonly queued: string[] = [];
	private readonly listeners = new Set<() => void>();
	private taking = 0;
	private told: FramePictures = { shown: {}, waiting: 0 };

	override now(): FramePictures {
		return this.told;
	}

	override isCurrent(frame: string, key: string): boolean {
		return this.shown.get(frame)?.key === key;
	}

	override watch(changed: () => void): () => void {
		this.listeners.add(changed);
		return () => void this.listeners.delete(changed);
	}

	override ask(asks: readonly PictureAsk[], pictureOf: PictureTaker): void {
		for (const { frame, key, node } of asks) {
			if (this.isCurrent(frame, key) || this.waiting.get(frame)?.key === key) continue;
			this.waiting.set(frame, { key, node, pictureOf });
			void this.storedOrQueued(frame, key);
		}
		this.tell();
	}

	private async storedOrQueued(frame: string, key: string): Promise<void> {
		const stored = await framePictureOf(frame).catch(() => null);
		if (stored && this.shown.get(frame)?.key !== stored.key) this.show(frame, stored.key, stored.picture);
		if (stored?.key === key) return this.settle(frame);
		this.queued.push(frame);
		window.setTimeout(() => this.takeMore(), SETTLED_AFTER_MS);
	}

	private takeMore(): void {
		while (this.taking < AT_ONCE && this.queued.length > 0) {
			const frame = this.queued.shift();
			if (frame === undefined) return;
			this.taking += 1;
			void this.take(frame).finally(() => {
				this.taking -= 1;
				this.takeMore();
			});
		}
	}

	private async take(frame: string): Promise<void> {
		while (msSinceMoved() < STILL_FOR_MS) await pause(STILL_FOR_MS);
		const asked = this.waiting.get(frame);
		if (!asked?.node.isConnected) return this.settle(frame);
		try {
			const picture = await pictureOf(asked.node, asked.pictureOf);
			this.show(frame, asked.key, picture);
			await keepFramePicture(frame, asked.key, picture).catch((failure: unknown) =>
				console.warn("[widgetarium] a canvas picture was made but not kept; it is made again next time", failure),
			);
		} catch (failure) {
			console.warn("[widgetarium] a canvas picture was not made; the frame stays live", frame, failure);
		}
		this.settle(frame);
	}

	private show(frame: string, key: string, picture: Blob): void {
		const was = this.shown.get(frame);
		if (was) URL.revokeObjectURL(was.url);
		this.shown.set(frame, { key, url: URL.createObjectURL(picture) });
		this.tell();
	}

	private settle(frame: string): void {
		this.waiting.delete(frame);
		this.tell();
	}

	private tell(): void {
		this.told = { shown: Object.fromEntries(this.shown), waiting: this.waiting.size };
		for (const listener of [...this.listeners]) listener();
	}
}

async function pictureOf(node: HTMLElement, canvasOf: PictureTaker): Promise<Blob> {
	const canvas = await canvasOf(node, SNAPSHOT_SCALE);
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
	if (!blob) throw new Error("the canvas gave no picture");
	return blob;
}

function pause(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
