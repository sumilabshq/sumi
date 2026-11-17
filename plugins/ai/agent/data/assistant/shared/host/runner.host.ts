import type { QuickAskLauncher, TurnLauncher } from "@widgetarium/core/engine/assistant-port.js";
import type { RunnerCatalog } from "../schema/runner.schema.js";

export interface Runner extends RunnerCatalog {
	readonly launchOf: TurnLauncher;
	readonly quickAskOf: QuickAskLauncher;
	readonly quickModel: string | null;
}
