import type { TurnLauncher } from "@widgetarium/core/engine/assistant-port.js";
import type { RunnerCatalog } from "../schema/runner.schema.js";

export interface Runner extends RunnerCatalog {
	readonly launchOf: TurnLauncher;
}
