import { PaneTabsGateway } from "./pane-tabs.gateway.js";

export class NoPaneTabsGateway extends PaneTabsGateway {
	tabIdsInPanes(): readonly string[] {
		return [];
	}

	reveal(): void {}

	closePanesOf(): void {}

	openShownTabPane(): void {}

	closeShownTabPane(): void {}

	showInTargetPane(): boolean {
		return false;
	}

	watch(): () => void {
		return () => undefined;
	}
}
