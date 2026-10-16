import { ItemView } from "obsidian";
import type { App, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { createElement as h } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { shieldFromEditor } from "@widgetarium/core/editor-shield.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { CANVAS_OPENED_ON, DesignStage } from "@widgetarium/studio";
import type { CanvasHandle, CanvasOpening, GpuSupply, StageMount } from "@widgetarium/studio";
import type { ObsidianHost } from "@widgetarium/core/mediator";
import { obsidianGpuSupply } from "./gpu-supply-obsidian.js";
import type { ObsidianDesignHeld } from "@widgetarium/canvas";
import { designHeldOf } from "./design-held.js";
import type WidgetariumPlugin from "../main.js";

export const DESIGN_VIEW_TYPE = "widgetarium-design";

const TITLE = "Design · {app}";

export class DesignView extends ItemView {
	private appName = "";
	private fromNote = "";
	private view: CanvasOpening = CANVAS_OPENED_ON;
	private node: HTMLElement | null = null;
	private canvas: CanvasHandle | null = null;
	private readonly onCanvas = (canvas: CanvasHandle): void => {
		this.canvas = canvas;
	};
	private readonly held: ObsidianDesignHeld;
	private readonly gpu: GpuSupply;
	private readonly onKept = (view: CanvasOpening): void => {
		this.view = view;
		this.app.workspace.requestSaveLayout();
	};
	private readonly ownsPaste = (): boolean => this.app.workspace.getActiveViewOfType(DesignView) === this;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: WidgetariumPlugin,
	) {
		super(leaf);
		this.held = designHeldOf(plugin, { leafOf: () => this.leaf, fromNote: () => this.fromNote });
		this.gpu = obsidianGpuSupply(plugin);
	}

	getViewType(): string {
		return DESIGN_VIEW_TYPE;
	}

	getDisplayText(): string {
		return TITLE.replace("{app}", this.appName);
	}

	override getIcon(): string {
		return "layout-dashboard";
	}

	override getState(): Record<string, unknown> {
		const { page, isLayersOpen, mode } = this.view;
		return { app: this.appName, page, fromNote: this.fromNote, layers: isLayersOpen, mode };
	}

	override async setState(state: unknown, result: ViewStateResult): Promise<void> {
		const isDrawn = this.canvas !== null && textIn(state, "app") === this.appName;
		this.appName = textIn(state, "app");
		this.fromNote = textIn(state, "fromNote");
		this.view = {
			page: textIn(state, "page"),
			isLayersOpen: isObject(state) && state["layers"] === true,
			mode: isObject(state) && state["mode"] === "pointer" ? "pointer" : "hand",
		};
		if (isDrawn && this.view.page) this.canvas?.showPage(this.view.page);
		await super.setState(state, result);
		refreshHeader(this.leaf);
		this.draw();
	}

	override async onOpen(): Promise<void> {
		this.contentEl.addClass("wg-design-view");
		this.node = this.contentEl.createDiv({ cls: "wg-mount wg-design-mount wg-portal" });
		shieldFromEditor(this.node);
		await this.plugin.started;
		const watched = new ResizeObserver(() => this.draw());
		watched.observe(this.contentEl);
		this.register(() => watched.disconnect());
		this.draw();
	}

	override async onClose(): Promise<void> {
		if (this.node) render(null, this.node);
		this.node = null;
	}

	private draw(): void {
		const node = this.node;
		const size = { width: this.contentEl.clientWidth, height: this.contentEl.clientHeight };
		if (!node || !this.appName || size.width === 0 || size.height === 0) return;
		const { held, onKept, onCanvas, ownsPaste, gpu } = this;
		const app = this.appName;
		const hostOf = (mount: StageMount): ObsidianHost => ({
			platform: "obsidian",
			app: this.app,
			canvas: { ...mount, ownsPaste, gpu, design: { kind: "vault", held }, returnTo: "app-note" },
		});
		render(h(DesignStage, { key: app, app, opening: this.view, hostOf, onKept, onCanvas, size }), node);
	}
}

export function registerDesignView(plugin: WidgetariumPlugin): void {
	plugin.registerView(DESIGN_VIEW_TYPE, (leaf) => new DesignView(leaf, plugin));
}

export async function openDesign(obsidian: App, app: string, page?: string): Promise<void> {
	const open = obsidian.workspace.getLeavesOfType(DESIGN_VIEW_TYPE).find((held) => held.view.getState()["app"] === app);
	const leaf = open ?? obsidian.workspace.getLeaf("tab");
	const kept = open?.view.getState() ?? {};
	await leaf.setViewState({ type: DESIGN_VIEW_TYPE, active: true, state: { ...kept, app, ...(page ? { page } : {}) } });
	await obsidian.workspace.revealLeaf(leaf);
}

function textIn(state: unknown, key: string): string {
	const value = isObject(state) ? state[key] : undefined;
	return typeof value === "string" ? value : "";
}

function refreshHeader(leaf: unknown): void {
	if (isObject(leaf) && typeof leaf["updateHeader"] === "function") Reflect.apply(leaf["updateHeader"], leaf, []);
}
