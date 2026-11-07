import { createElement as h, useMemo, useRef, useSyncExternalStore } from "react";
import type { ComponentType, ReactElement, RefObject } from "react";
import { registerPacks } from "@widgetarium/core/engine/packs.js";
import { NO_ASSISTANT } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import type { CataloguePort } from "@widgetarium/core/engine/catalogue-port.js";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { StudioPanel, StudioState, StudioView } from "@widgetarium/core/engine/studio-state-port.js";
import type { SurfaceHost } from "@widgetarium/core/surface/use-surface-shared.js";
import { openApp, startOpenedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { OpenedApp, ProjectStart, StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { WidgetariumProject } from "@widgetarium/core/app/widgetarium-project.js";
import type { Platform, RemoteTransport, Runtime } from "@widgetarium/data-framework";
import type { PaneView } from "@widgetarium/layout";
import { sumiAppPageUrlOf } from "@widgetarium/app-registry";
import type { AppPageUrlOf } from "@widgetarium/app-registry";
import type { DrawnTabPage, WindowOffers, WindowProviderProps } from "@sumi/sumi-host-plugin";
import { BUILT_IN_PROFILE, resolvePlugins } from "../plugins/sumi-plugins.js";
import type { ResolvedPlugins, WindowLayer } from "../plugins/sumi-plugins.js";
import { TabFaceContext } from "@sumi/sumi-host-plugin";
import { MenuTabFace } from "../features/app-host/ui/tab-face/menu-tab-face.js";
import type { AssistantHosts } from "@widgetarium/assistant/module";
import { createChatsColumnApp } from "../chats-column/chats-column-app.js";
import type { ChatsColumnApp } from "../chats-column/chats-column-app.js";
import { AppPlate } from "../frame/app-plate.js";
import { ChatPlate } from "../frame/chat-plate.js";
import { EmptyPanes } from "../frame/empty-panes.js";
import { PaneAppPlate } from "../frame/pane-app-plate.js";
import { StudioLayout } from "../frame/studio-layout.js";
import { browserStudioHost } from "./browser-studio-host.js";
import { browserCataloguePort } from "./catalogue/browser-catalogue-port.js";
import { STUDIO_PACKS } from "./logic/studio-pack.js";
import { webStudioDesign } from "../canvas/studio-canvas.js";
import type { StudioDesign } from "../canvas/studio-canvas.js";
import { frameCoreModulesOf, startCoreInProcess, startStudioApp } from "../tabs/studio-app.js";
import { frameRoutesOf } from "../tabs/frame-routes.js";
import { startWindowServer } from "../tabs/window-server.js";
import { startStudioAppearance } from "../tabs/studio-appearance.js";
import type { StudioAppearance } from "../tabs/studio-appearance.js";
import type { FrameRoutesFor } from "../features/app-frame/lib/frame-relay.js";
import type { StudioBrowser } from "../browser/browser-app.js";
import { useTakesCatalogueAsks } from "./studio-on-screen.js";
import { StudioSidebar } from "./studio-sidebar.js";
import { createStudioState } from "./studio-state.js";
import { useStudioPortalClass } from "./use-studio-portal-class.js";

export interface StartedStudio {
	readonly project: StartedProject;
	readonly studio: StudioHostPort;
	readonly assistant: AssistantPort;
	readonly catalogue: CataloguePort;
	readonly appId: string;
	readonly state: StudioState;
	readonly design: StudioDesign;
	readonly browser: StudioBrowser;
	readonly studioApp: Runtime;
	readonly frameRoutes: FrameRoutesFor;
	readonly chatsColumn: ChatsColumnApp;
	readonly appearance: StudioAppearance;
	readonly appPageUrlOf: AppPageUrlOf;
	readonly tabPages: readonly DrawnTabPage[];
	readonly windowOffers: WindowOffers;
	readonly windowProviders: readonly ComponentType<WindowProviderProps>[];
	readonly windowLayers: readonly WindowLayer[];
}

export interface StudioStart extends ProjectStart {
	readonly studio?: StudioHostPort;
	readonly assistant?: AssistantPort;
	readonly catalogue?: CataloguePort;
	readonly appId?: string;
	readonly state?: StudioState;
	readonly design?: StudioDesign;
	readonly assistantHost?: AssistantHosts;
	readonly studioApp?: Runtime;
	readonly core?: RemoteTransport;
	readonly platform?: Platform;
	readonly appearance?: StudioAppearance;
	readonly appPageUrlOf?: AppPageUrlOf;
	readonly plugins?: ResolvedPlugins;
}

export interface WidgetariumStudioProps {
	readonly started: StartedStudio;
}

type LentPort = "appId" | "studio" | "assistant" | "catalogue" | "design";

interface StudioScreen {
	readonly frame: RefObject<HTMLDivElement | null>;
	readonly pathname: string;
	readonly view: StudioView;
	readonly panel: StudioPanel;
	readonly host: SurfaceHost;
	readonly catalogueAsk: number | null;
	readonly backToView: () => void;
}

export function startStudio(project: WidgetariumProject, start: StudioStart = {}): StartedStudio {
	registerPacks(...STUDIO_PACKS);
	return startOpenedStudio(openApp(project), start);
}

export function startOpenedStudio(opened: OpenedApp, start: StudioStart): StartedStudio {
	const project = startOpenedProject(opened, start);
	const lent = lentPortsOf(opened, start);
	const plugins = start.plugins ?? resolvePlugins(BUILT_IN_PROFILE);
	const core = start.core ?? startCoreInProcess(lent.appId, plugins.backgroundModules);
	const studioApp =
		start.studioApp ??
		startStudioApp({
			platform: "browser",
			workspaceId: lent.appId,
			core,
			backgroundModules: plugins.backgroundModules,
			windowModules: plugins.windowModules,
		});
	const state = start.state ?? createStudioState(studioApp);
	const appearance = start.appearance ?? startStudioAppearance(window);
	const chatsColumn = createChatsColumnApp(studioApp);
	const platform = start.platform ?? "browser";
	const windowOffers: WindowOffers = {
		workspaceId: lent.appId,
		platform,
		windowApp: studioApp,
		core,
		windowServer: startWindowServer(plugins.windowServerModules, {
			workspaceId: lent.appId,
			platform,
			core,
			assistant: assistantHostOf(start),
		}),
		focusedChatId: () => chatsColumn.focusedChat.now()?.id ?? null,
	};
	return {
		...lent,
		browser: {
			browserApp: studioApp,
		},
		chatsColumn,
		studioApp,
		appearance,
		appPageUrlOf: start.appPageUrlOf ?? sumiAppPageUrlOf,
		tabPages: plugins.tabPages,
		windowOffers,
		windowProviders: plugins.windowProviders.map(({ providerOf }) => providerOf(windowOffers)),
		windowLayers: plugins.windowLayers,
		frameRoutes: frameRoutesOf({
			workspaceId: lent.appId,
			core,
			coreModules: frameCoreModulesOf(plugins.backgroundModules),
			appearance: appearance.transport,
			frameModules: plugins.frameModules.map(({ contract, servingOf }) => ({
				contract,
				serving: servingOf(windowOffers),
			})),
		}),
		project,
		state,
	};
}

export function WidgetariumStudio({ started }: WidgetariumStudioProps): ReactElement {
	const { project, state } = started;
	const pathname = useSyncExternalStore(project.router.subscribe, project.router.pathname);
	const { view, panel } = useSyncExternalStore(state.subscribe, state.now);
	const host = useMemo(() => project.hostOf(pathname), [project, pathname]);
	const frame = useRef<HTMLDivElement | null>(null);
	useStudioPortalClass();
	const catalogueAsk = useTakesCatalogueAsks(frame, started.catalogue.requests, state);
	const backToView = useMemo(() => () => state.show("app"), [state]);
	return h(
		TabFaceContext.Provider,
		{ value: MenuTabFace },
		studioLayoutOf(started, { frame, pathname, view, panel, host, catalogueAsk, backToView }),
	);
}

function studioLayoutOf(started: StartedStudio, screen: StudioScreen): ReactElement {
	return h(StudioLayout, {
		frame: screen.frame,
		layoutApp: started.studioApp,
		frameRoutes: started.frameRoutes,
		appPageUrlOf: started.appPageUrlOf,
		tabPages: started.tabPages,
		windowOffers: started.windowOffers,
		windowProviders: started.windowProviders,
		windowLayers: started.windowLayers,
		studio: started.studio,
		left: started.chatsColumn.column,
		panes: {
			drawn: (view: PaneView) => paneOf(started, screen, view),
			empty: h(EmptyPanes),
		},
		panel: cataloguePanelOf(started, screen),
	});
}

function paneOf(started: StartedStudio, screen: StudioScreen, view: PaneView): ReactElement {
	if (view.kind === "chat") {
		return chatPlateOf(started, view.chatId ?? null);
	}

	if (view.tabId === null) {
		return appPlateOf(started, screen);
	}

	return h(PaneAppPlate, {
		tabId: view.tabId,
		browser: started.browser,
		design: started.design,
		project: started.project,
	});
}

function chatPlateOf({ chatsColumn }: StartedStudio, chatId: string | null): ReactElement {
	return h(ChatPlate, {
		key: chatId ?? "",
		chatId,
		crumb: chatsColumn.crumbOf(chatId),
		more: chatsColumn.moreOf(chatId),
	});
}

function appPlateOf(started: StartedStudio, { pathname, view, backToView }: StudioScreen): ReactElement {
	return h(AppPlate, {
		project: started.project,
		pathname,
		view,
		design: started.design,
		browser: started.browser,
		workspaces: started.chatsColumn.workspaces,
		backToView,
	});
}

function cataloguePanelOf(started: StartedStudio, { panel, host, catalogueAsk }: StudioScreen): ReactElement | null {
	if (panel === "none") {
		return null;
	}

	const { catalogue, state } = started;
	return h(StudioSidebar, { catalogue, host, catalogueAsk, onClose: () => state.closePanel("catalogue") });
}

function assistantHostOf(start: StudioStart): AssistantHosts {
	return start.assistantHost ?? { kind: "web", webAssistant: start.assistant ?? NO_ASSISTANT };
}

function lentPortsOf(opened: OpenedApp, start: StudioStart): Pick<StartedStudio, LentPort> {
	return {
		appId: start.appId ?? opened.app.name,
		studio: start.studio ?? browserStudioHost(opened.app, opened.routes),
		assistant: start.assistant ?? NO_ASSISTANT,
		catalogue: start.catalogue ?? browserCataloguePort(opened.registry),
		design: start.design ?? webStudioDesign(opened.app.name),
	};
}
