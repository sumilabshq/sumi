import { invoke } from "@tauri-apps/api/core";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { z } from "zod";
import { MAIN_STUDIO_WINDOW, studioWindowOf, viewFileOf } from "@widgetarium/behaviors";
import type { StudioWindow } from "@widgetarium/behaviors";
import { GLOBAL_ROOT, HeldDoc, StoreClient, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind } from "@widgetarium/behaviors/tauri-store";
import { USUAL_WIDTHS } from "../../shared/lib/frame-bounds.js";
import { KeptSidesSchema, TauriFrameSidesGateway } from "../frame-sides/tauri.gateway.js";
import { KeptWidthsSchema, TauriFrameWidthsGateway } from "../frame-widths/tauri.gateway.js";
import { KeptPanesSchema, TauriPaneTreeGateway } from "../pane-tree/tauri.gateway.js";
import { groupedChat } from "../../shared/lib/chat-groups.js";
import type { PaneTree, PaneView } from "../../shared/schema/pane-tree.schema.js";
import type { LayoutParts } from "./layout-parts.gateway.js";
import { FIRST_PANES, FIRST_SIDES } from "./memory.gateway.js";

const SettingsSchema = z.looseObject(KeptWidthsSchema.shape);

const SessionSchema = z.looseObject({
	...KeptPanesSchema.shape,
	...KeptSidesSchema.shape,
});

const WORKSPACE_SESSION = "session.json";

type Settings = z.infer<typeof SettingsSchema>;

type Session = z.infer<typeof SessionSchema>;

const SETTINGS: DocKind<Settings> = {
	file: "settings.json",
	v: 1,
	schema: SettingsSchema,
};

// TRADE-OFF: a static import puts the Tauri invoke into the browser bundle too; export conditions would need a condition the test loader and the Vite configs do not set
export function tauriLayoutParts(workspaceId: string): LayoutParts {
	const store = new StoreClient(tauriInvoke);
	const settings = HeldDoc.reading({ store, root: GLOBAL_ROOT, kind: SETTINGS, empty: SettingsSchema.parse({}) });
	const studioWindow = studioWindowOf(location.search);
	const docOf = (file: string): HeldDoc<Session> =>
		HeldDoc.reading({
			store,
			root: workspaceRootOf(workspaceId),
			kind: sessionOf(file),
			empty: SessionSchema.parse({}),
		});
	const workspaceSession = docOf(WORKSPACE_SESSION);
	const windowFile = viewFileOf(studioWindow);
	const windowView = windowFile === WORKSPACE_SESSION ? workspaceSession : docOf(windowFile);
	const paneTree = new TauriPaneTreeGateway(workspaceSession, {
		label: studioWindow.label,
		first: firstPanesOf(bootOf(studioWindow)),
		boot: bootOf(studioWindow),
	});
	forgetsOnClose(paneTree, studioWindow.label);
	forgetsDeadWindows(paneTree, studioWindow.label);
	return {
		frameSides: new TauriFrameSidesGateway(windowView, FIRST_SIDES),
		frameWidths: new TauriFrameWidthsGateway(settings, USUAL_WIDTHS),
		paneTree,
	};
}

function forgetsDeadWindows(paneTree: TauriPaneTreeGateway, label: string): void {
	if (label !== MAIN_STUDIO_WINDOW) {
		return;
	}

	const stop = paneTree.treeChanged(() => {
		if (!paneTree.isLoaded()) {
			return;
		}

		stop();
		void getAllWindows().then((windows) =>
			paneTree.forgetWindowsExcept(
				windows.map((window) => window.label),
				"the main window started and they are not open",
			),
		);
	});
}

function forgetsOnClose(paneTree: TauriPaneTreeGateway, label: string): void {
	if (label === MAIN_STUDIO_WINDOW) {
		return;
	}

	void getCurrentWindow().onCloseRequested(() =>
		paneTree.forgetOwnWindow(`window ${label} closed, its tabs go back to the lists`),
	);
}

function sessionOf(file: string): DocKind<Session> {
	return {
		file,
		v: 1,
		schema: SessionSchema,
	};
}

function bootOf({ bootTab, bootChat }: StudioWindow): PaneView | null {
	if (bootChat !== null) {
		return {
			kind: "chat",
			chatId: bootChat,
		};
	}

	return bootTab === null
		? null
		: {
				kind: "app",
				tabId: bootTab,
			};
}

function firstPanesOf(boot: PaneView | null): PaneTree {
	if (boot === null) {
		return FIRST_PANES;
	}

	if (boot.kind === "chat" && boot.chatId !== undefined) {
		return {
			root: groupedChat({ kind: "pane", id: "pane-torn", view: boot }, boot.chatId),
			minted: 0,
			targetId: null,
			chatTargetId: "pane-torn",
		};
	}

	return {
		root: {
			kind: "pane",
			id: "pane-torn",
			view: boot,
		},
		minted: 0,
		targetId: "pane-torn",
	};
}

function tauriInvoke(command: string, args: Readonly<Record<string, unknown>>): Promise<unknown> {
	return invoke(command, args);
}
