import type { App, TFile, WorkspaceLeaf } from "obsidian";
import type { BrowserParts } from "@widgetarium/browser/gateways";
import type { AppHostParts } from "@widgetarium/app-host/gateways";
import { createElement as h } from "react";
import type { ReactElement } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { SurfaceHost } from "@widgetarium/core/surface/use-surface-shared.js";
import { hostOverRouter } from "@widgetarium/core/app";
import { WidgetariumStudio, createStudioState, startOpenedStudio, startedAppHostParts } from "@widgetarium/studio";
import type { StartedStudio, StudioDesign, StudioState } from "@widgetarium/studio";
import type { AppOpening, AppProjects } from "./app-projects.js";
import { refusalOf, reportNotDrawn, reportRefused } from "./app-refusal.js";
import { obsidianStudioHost } from "./studio-host-obsidian.js";
import { APP_KEY, studioNoteOf } from "./studio-note.js";
import type { StudioNote } from "./studio-note.js";
import type { StudioRouting } from "./studio-routing.js";

export interface StudioPlace {
	readonly app: App;
	readonly projects: AppProjects;
	readonly viewType: string;
	readonly assistant: AssistantPort;
	readonly browser: BrowserParts;
	hostOf(notePath: string): SurfaceHost;
	designFor(app: string, leaf: WorkspaceLeaf): Promise<StudioDesign>;
	openAsMarkdown(leaf: WorkspaceLeaf, file: TFile): Promise<void>;
	showAsMarkdown(leaf: WorkspaceLeaf, file: TFile): Promise<void>;
}

export interface ShownNote {
	readonly file: TFile;
	readonly note: StudioNote | null;
	readonly node: HTMLElement;
	readonly leaf: WorkspaceLeaf;
	readonly frame: HTMLElement;
}

interface StudioDrawing {
	readonly place: StudioPlace;
	readonly shown: ShownNote;
	readonly note: StudioNote;
	readonly studio: StudioHostPort;
	readonly state: StudioState;
	readonly appHost: AppHostParts;
	readonly routing: StudioRouting;
}

type OpenedApp = Extract<AppOpening, { readonly ok: true }>;

const NAMES_NO_APP = `This note opens in the studio, but its front matter names no app. Add "${APP_KEY}: <project folder>" to it.`;

export function studioNoteOfFile(app: App, file: TFile): StudioNote | null {
	return studioNoteOf(app.metadataCache.getFileCache(file)?.frontmatter);
}

export function drawStudio(place: StudioPlace, shown: ShownNote, routing: StudioRouting): () => void {
	const { note } = shown;
	if (!note) {
		render(refusalOf(NAMES_NO_APP), shown.node);
		return () => undefined;
	}
	const studio = obsidianStudioHost({ app: place.app, leaf: shown.leaf, frame: shown.frame, viewType: place.viewType });
	const state = createStudioState();
	const appHost = startedAppHostParts({ state, browser: place.browser, workspace: note.folder, studio });
	const stopDrawing = redrawOnEveryChange({ place, shown, note, studio, state, appHost, routing });
	return () => {
		stopDrawing();
		appHost.pageFactsGateway.stop();
	};
}

function redrawOnEveryChange(drawing: StudioDrawing): () => void {
	let latest = 0;
	const draw = (): void => {
		const asked = (latest += 1);
		void drawOpening(drawing, () => latest === asked);
	};
	const stopWatching = drawing.place.projects.watch(drawing.note.folder, draw);
	draw();
	return () => {
		latest = -1;
		stopWatching();
	};
}

async function drawOpening(drawing: StudioDrawing, isCurrent: () => boolean): Promise<void> {
	const { folder } = drawing.note;
	try {
		const element = await openingElementOf(drawing, await drawing.place.projects.open(folder));
		if (isCurrent()) render(element, drawing.shown.node);
	} catch (failure) {
		const said = reportNotDrawn(folder, failure);
		if (isCurrent()) render(refusalOf(said), drawing.shown.node);
	}
}

async function openingElementOf(drawing: StudioDrawing, opening: AppOpening): Promise<ReactElement> {
	if (!opening.ok) return refusalOf(reportRefused(drawing.note.folder, opening.findings));
	const design = await drawing.place.designFor(opening.app.name, drawing.shown.leaf);
	return h(WidgetariumStudio, { key: opening.version, started: startStudioOver(drawing, opening, design) });
}

function startStudioOver(drawing: StudioDrawing, opening: OpenedApp, design: StudioDesign): StartedStudio {
	const { place, shown, note, studio, state, appHost } = drawing;
	const notePath = shown.file.path;
	const router = drawing.routing.routerFor(note, opening.routes);
	const hostOf = hostOverRouter(() => place.hostOf(notePath), router);
	return startOpenedStudio(
		{ app: opening.app, routes: opening.routes, registry: opening.registry },
		{
			router,
			hostOf,
			studio,
			state,
			assistant: place.assistant,
			browser: place.browser,
			appHost,
			appId: note.folder,
			design,
		},
	);
}
