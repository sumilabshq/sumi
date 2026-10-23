import { createElement as h, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { WidgetariumStudio } from "@widgetarium/studio";
import type { StartedStudio } from "@widgetarium/studio";
import type { TauriOpening } from "./tauri-opening.js";
import { UnopenedScreen } from "./unopened-screen.js";

export interface TauriStartupProps {
	readonly opening: TauriOpening<StartedStudio>;
}

export function TauriStartup({ opening }: TauriStartupProps): ReactElement | null {
	const state = useSyncExternalStore(opening.subscribe, opening.now);
	if (state.kind === "reading") {
		return null;
	}

	if (state.kind === "unopened") {
		return h(UnopenedScreen, {
			failure: state.failure,
			onRetry: () => void opening.retry(),
		});
	}

	return h(WidgetariumStudio, { started: state.started });
}
