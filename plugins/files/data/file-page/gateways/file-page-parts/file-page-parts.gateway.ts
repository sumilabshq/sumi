import type { ConfigFacts } from "@widgetarium/data-framework";
import type { FilePageConfig } from "../../shared/host/file-page.host.js";
import type { HeldFileGateway } from "../held-file/held-file.gateway.js";
import { MemoryHeldFileGateway } from "../held-file/memory.gateway.js";
import { GivenPageTabGateway } from "../page-tab/given.gateway.js";
import type { PageTabGateway } from "../page-tab/page-tab.gateway.js";
import type { SwitchesGateway } from "../switches/switches.gateway.js";
import { MemorySwitchesGateway } from "../switches/memory.gateway.js";

export type FilePageParts = {
	readonly switches: SwitchesGateway;
	readonly pageTab: PageTabGateway;
	readonly heldFile: HeldFileGateway;
};

export function filePagePartsOn({ config }: ConfigFacts<FilePageConfig>): FilePageParts {
	return {
		switches: new MemorySwitchesGateway({
			on: [],
			loads: 0,
		}),
		pageTab: new GivenPageTabGateway(config.tabId),
		heldFile: new MemoryHeldFileGateway(),
	};
}
