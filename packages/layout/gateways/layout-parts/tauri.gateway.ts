import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import { GLOBAL_ROOT, HeldDoc, StoreClient, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind } from "@widgetarium/behaviors/tauri-store";
import { USUAL_WIDTHS } from "../../shared/lib/frame-bounds.js";
import { KeptSidesSchema, TauriFrameSidesGateway } from "../frame-sides/tauri.gateway.js";
import { KeptWidthsSchema, TauriFrameWidthsGateway } from "../frame-widths/tauri.gateway.js";
import { KeptPanesSchema, TauriPaneTreeGateway } from "../pane-tree/tauri.gateway.js";
import type { LayoutParts } from "./layout-parts.gateway.js";
import { FIRST_PANES, FIRST_SIDES } from "./memory.gateway.js";

const SettingsSchema = z.looseObject({
	...KeptWidthsSchema.shape,
	...KeptSidesSchema.shape,
});

const SessionSchema = z.looseObject(KeptPanesSchema.shape);

type Settings = z.infer<typeof SettingsSchema>;

type Session = z.infer<typeof SessionSchema>;

const SETTINGS: DocKind<Settings> = {
	file: "settings.json",
	v: 1,
	schema: SettingsSchema,
};

const SESSION: DocKind<Session> = {
	file: "session.json",
	v: 1,
	schema: SessionSchema,
};

// TRADE-OFF: a static import puts the Tauri invoke into the browser bundle too; export conditions would need a condition the test loader and the Vite configs do not set
export function tauriLayoutParts(workspaceId: string): LayoutParts {
	const store = new StoreClient(tauriInvoke);
	const settings = HeldDoc.reading({ store, root: GLOBAL_ROOT, kind: SETTINGS, empty: SettingsSchema.parse({}) });
	const session = HeldDoc.reading({
		store,
		root: workspaceRootOf(workspaceId),
		kind: SESSION,
		empty: SessionSchema.parse({}),
	});
	return {
		frameSides: new TauriFrameSidesGateway(settings, FIRST_SIDES),
		frameWidths: new TauriFrameWidthsGateway(settings, USUAL_WIDTHS),
		paneTree: new TauriPaneTreeGateway(session, FIRST_PANES),
	};
}

function tauriInvoke(command: string, args: Readonly<Record<string, unknown>>): Promise<unknown> {
	return invoke(command, args);
}
