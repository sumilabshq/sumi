import type { ReactNode } from "react";
import { startGpuCanvas } from "./gpu/index.js";
import type { GpuCanvas } from "./gpu/index.js";
import type { Look, LookWatcher } from "../local/pan-zoom.js";
import { reasonOf } from "./gpu-pages.js";
import type { GpuPageClaim, GpuPages } from "./gpu-pages.js";
import { forwardFramePointer } from "./gpu-frame-pointer.js";
import type { GpuSupply } from "./gpu-supply.js";

export interface PagesLayout {
	readonly layerOf: () => HTMLElement | null;
	readonly lookNow: () => Look;
	readonly watchLook: (watcher: LookWatcher) => () => void;
}

interface HeldClaim {
	readonly claim: GpuPageClaim;
	element: ReactNode;
	stopPointer: () => void;
}

const SWITCHES = { titles: false, transparent: true, pans: false } as const;
const FELL_BACK = "[widgetarium] a GPU frame fell back to its HTML picture";

export class GpuPagesHost implements GpuPages {
	private gpu: GpuCanvas | null = null;
	private startFailure: string | null = null;
	private isStopped = false;
	private measuring = 0;
	private readonly held = new Map<string, HeldClaim>();
	private readonly failed = new Map<string, string>();
	private readonly listeners = new Set<() => void>();
	private readonly stops: (() => void)[] = [];

	constructor(
		private readonly supply: GpuSupply,
		private readonly layout: PagesLayout,
	) {}

	async start(canvas: HTMLCanvasElement): Promise<void> {
		try {
			const fonts = await this.supply.loadFonts();
			const gpu = await startGpuCanvas(canvas, {
				loadCanvasKit: this.supply.loadCanvasKit,
				fonts,
				switches: SWITCHES,
				tokensFrom: canvas.parentElement ?? undefined,
			});
			if (this.isStopped) return gpu.stop();
			this.gpu = gpu;
			this.follow(gpu);
			for (const held of this.held.values()) this.add(gpu, held);
		} catch (failure) {
			this.startFailure = reasonOf(failure);
			for (const id of [...this.held.keys()]) this.fail(id, failure);
		}
	}

	stop(): void {
		this.isStopped = true;
		cancelAnimationFrame(this.measuring);
		for (const stop of this.stops.splice(0)) stop();
		for (const held of this.held.values()) held.stopPointer();
		this.gpu?.stop();
		this.gpu = null;
	}

	claim(claim: GpuPageClaim, element: ReactNode): () => void {
		const held: HeldClaim = { claim, element, stopPointer: () => undefined };
		this.held.set(claim.id, held);
		if (this.startFailure !== null) this.fail(claim.id, this.startFailure);
		else if (this.gpu) this.add(this.gpu, held);
		return () => {
			held.stopPointer();
			if (this.held.get(claim.id) === held) this.held.delete(claim.id);
			this.gpu?.removeFrame(claim.id);
			this.measureSoon();
		};
	}

	redraw(id: string, element: ReactNode): void {
		const held = this.held.get(id);
		if (!held || held.element === element) return;
		held.element = element;
		this.gpu?.renderFrame(id, element);
	}

	// TODO: forget a failure once its frame is redrawn from a changed design
	fail(id: string, failure: unknown): void {
		if (this.failed.has(id)) return;
		const why = reasonOf(failure);
		this.failed.set(id, why);
		console.warn(FELL_BACK, id, why);
		this.gpu?.removeFrame(id);
		for (const listener of this.listeners) listener();
	}

	failureOf(id: string): string | undefined {
		return this.failed.get(id);
	}

	failures(): ReadonlyMap<string, string> {
		return this.failed;
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	textIn(id: string, includes: string): string | null {
		return this.gpu?.textIn(id, includes) ?? null;
	}

	locateText(id: string, text: string): { readonly x: number; readonly y: number } | null {
		return this.gpu?.locateText(id, text) ?? null;
	}

	work(): ReturnType<GpuCanvas["stats"]> | null {
		return this.gpu?.stats() ?? null;
	}

	private add(gpu: GpuCanvas, held: HeldClaim): void {
		const { claim } = held;
		if (this.failed.has(claim.id)) return;
		gpu.addFrame({
			...claim,
			at: this.placeOf(claim.node) ?? { x: 0, y: 0 },
			element: held.element,
			onFailure: (failure) => this.fail(claim.id, failure),
			onHeight: (height) => {
				claim.node.style.height = `${height}px`;
				this.measureSoon();
			},
		});
		held.stopPointer = forwardFramePointer(claim.node, gpu);
		this.measureSoon();
	}

	private follow(gpu: GpuCanvas): void {
		const cameraOf = (look: Look) => ({ x: look.x, y: look.y, zoom: look.scale });
		gpu.setCamera(cameraOf(this.layout.lookNow()));
		this.stops.push(this.layout.watchLook((look) => gpu.drawAt(cameraOf(look))));
		const layer = this.layout.layerOf();
		if (!layer) return;
		const sizes = new ResizeObserver(() => this.measureSoon());
		sizes.observe(layer);
		this.stops.push(() => sizes.disconnect());
	}

	private measureSoon(): void {
		if (this.measuring !== 0 || !this.gpu) return;
		this.measuring = requestAnimationFrame(() => {
			this.measuring = 0;
			for (const { claim } of this.held.values()) {
				const at = this.placeOf(claim.node);
				if (at) this.gpu?.moveFrame(claim.id, at);
			}
		});
	}

	private placeOf(node: HTMLElement): { readonly x: number; readonly y: number } | null {
		const layer = this.layout.layerOf();
		if (!layer || !node.isConnected) return null;
		const scale = this.layout.lookNow().scale || 1;
		const origin = layer.getBoundingClientRect();
		const drawn = node.getBoundingClientRect();
		return { x: (drawn.left - origin.left) / scale, y: (drawn.top - origin.top) / scale };
	}
}
