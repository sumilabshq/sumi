import { createElement as h, useMemo, useRef, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { registerPacks } from "@widgetarium/core/engine/packs.js";
import { NO_ASSISTANT } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import type { CataloguePort } from "@widgetarium/core/engine/catalogue-port.js";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import { openApp, startOpenedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { OpenedApp, ProjectStart, StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { WidgetariumProject } from "@widgetarium/core/app/widgetarium-project.js";
import { memoryMascotParts } from "@widgetarium/mascot/gateways";
import type { MascotParts } from "@widgetarium/mascot/gateways";
import { browserStudioHost } from "./browser-studio-host.js";
import { browserCataloguePort } from "./catalogue/browser-catalogue-port.js";
import { STUDIO_PACKS } from "./logic/studio-pack.js";
import { StudioBand } from "./studio-band.js";
import type { TopBarCorners } from "./studio-band.js";
import { StudioChat } from "./studio-chat.js";
import { StudioOutlet } from "./studio-outlet.js";
import { StudioShellBoard } from "./studio-shell-board.js";
import type { StudioShellBoardProps } from "./studio-shell-board.js";
import { webStudioDesign } from "../canvas/studio-canvas.js";
import type { StudioDesign } from "../canvas/studio-canvas.js";
import type { CanvasShell } from "../canvas/design-stage.js";
import { useTakesCatalogueAsks } from "./studio-on-screen.js";
import { StudioRail } from "./studio-rail.js";
import { StudioSidebar } from "./studio-sidebar.js";
import { createStudioState } from "./studio-state.js";
import { STUDIO_WIDGETS } from "./studio-widgets.js";
import { useAppName } from "./use-app-name.js";
import { useStudioPortalClass } from "./use-studio-portal-class.js";
import { useWritesChatWidth } from "./use-writes-chat-width.js";
import { useWritesHostInsets } from "./use-writes-host-insets.js";

export interface StartedStudio {
	readonly project: StartedProject;
	readonly studio: StudioHostPort;
	readonly assistant: AssistantPort;
	readonly catalogue: CataloguePort;
	readonly appId: string;
	readonly shellRegistry: ModuleRegistry;
	readonly state: StudioState;
	readonly design: StudioDesign;
	readonly mascot: MascotParts;
}

export interface StudioStart extends ProjectStart {
	readonly studio?: StudioHostPort;
	readonly assistant?: AssistantPort;
	readonly catalogue?: CataloguePort;
	readonly appId?: string;
	readonly state?: StudioState;
	readonly design?: StudioDesign;
	readonly mascot?: MascotParts;
}

type ShellBoardAsk = Omit<StudioShellBoardProps, "place">;

interface ShellBoards {
	readonly corners: TopBarCorners;
	readonly menu: ReactElement;
	readonly rail: ReactElement;
	readonly canvasShell: CanvasShell;
}

export interface WidgetariumStudioProps {
	readonly started: StartedStudio;
}

export function startStudio(project: WidgetariumProject, start: StudioStart = {}): StartedStudio {
	registerPacks(...STUDIO_PACKS);
	return startOpenedStudio(openApp(project), start);
}

export function startOpenedStudio(opened: OpenedApp, start: StudioStart): StartedStudio {
	const project = startOpenedProject(opened, start);
	return {
		project,
		studio: start.studio ?? browserStudioHost(opened.app, opened.routes),
		assistant: start.assistant ?? NO_ASSISTANT,
		catalogue: start.catalogue ?? browserCataloguePort(opened.registry),
		appId: start.appId ?? opened.app.name,
		shellRegistry: new ModuleRegistry(STUDIO_WIDGETS),
		state: start.state ?? createStudioState(),
		design: start.design ?? webStudioDesign(opened.app.name),
		mascot: start.mascot ?? memoryMascotParts(),
	};
}

export function WidgetariumStudio({ started }: WidgetariumStudioProps): ReactElement {
	const { project, studio, assistant, catalogue, appId, shellRegistry, state, design, mascot } = started;
	const pathname = useSyncExternalStore(project.router.subscribe, project.router.pathname);
	const { view, panel } = useSyncExternalStore(state.subscribe, state.now);
	const host = useMemo(() => project.hostOf(pathname), [project, pathname]);
	const frame = useRef<HTMLDivElement | null>(null);
	const appName = useAppName(studio, appId);
	useStudioPortalClass();
	useWritesHostInsets(frame, studio);
	useWritesChatWidth(frame, state.chatWidth);
	const catalogueAsk = useTakesCatalogueAsks(frame, catalogue.requests, state);
	const { corners, menu, rail, canvasShell } = shellBoardsOf({
		app: appId,
		registry: shellRegistry,
		host,
		studio,
		state,
	});
	const isCanvas = view === "canvas";
	return h("div", { ref: frame, className: `wg-studio${isCanvas ? " is-canvas" : ""}` }, [
		isCanvas ? null : h(StudioBand, { key: "band", corners }),
		h(StudioRail, { key: "rail", children: rail }),
		h(StudioChat, { key: "chat", assistant, mascot, menu, chatWidth: state.chatWidth, frame, appName }),
		h(StudioOutlet, { key: "outlet", project, pathname, view, design, state, shell: canvasShell }),
		panel === "none"
			? null
			: h(StudioSidebar, {
					key: "sidebar",
					catalogue,
					host,
					catalogueAsk,
					onClose: () => state.closePanel("catalogue"),
				}),
	]);
}

function shellBoardsOf(shell: ShellBoardAsk): ShellBoards {
	const corners = {
		start: h(StudioShellBoard, { key: `start ${shell.app}`, place: "start", ...shell }),
		end: h(StudioShellBoard, { key: `end ${shell.app}`, place: "end", ...shell }),
	} satisfies TopBarCorners;
	return {
		corners,
		menu: h(StudioShellBoard, { key: `menu ${shell.app}`, place: "menu", ...shell }),
		rail: h(StudioShellBoard, { key: `rail ${shell.app}`, place: "rail", ...shell }),
		canvasShell: {
			corners: {
				start: null,
				end: corners.end,
			},
		},
	};
}
