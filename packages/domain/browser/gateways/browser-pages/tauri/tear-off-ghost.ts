import type { GhostLay, GhostWorn } from "../../../shared/schema/tear-off-ghost.schema.js";
import type { PagesBridge } from "./pages-bridge.js";

export class TearOffGhost {
	constructor(private readonly bridge: PagesBridge) {}

	lay(lay: GhostLay): Promise<void> {
		return this.bridge.layTearOffGhost(lay);
	}

	wear(worn: GhostWorn): void {
		void this.bridge.wearTearOffGhost(worn).catch((failure: unknown) => {
			console.warn("[widgetarium] tear-off ghost could not change its shape", failure);
		});
	}

	show(shown: boolean): void {
		void this.bridge.showTearOffGhost(shown).catch((failure: unknown) => {
			console.warn(`[widgetarium] tear-off ghost could not turn ${shown ? "on" : "off"}`, failure);
		});
	}
}
