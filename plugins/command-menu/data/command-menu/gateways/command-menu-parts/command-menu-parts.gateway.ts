import type { CommandMenuConfig } from "../../shared/host/command-menu.host.js";
import type { CommandMenuGateway } from "../command-menu/command-menu.gateway.js";
import { MemoryCommandMenuGateway } from "../command-menu/memory.gateway.js";
import { ConfiguredMenuFillsGateway } from "../menu-fills/configured.gateway.js";
import type { MenuFillsGateway } from "../menu-fills/menu-fills.gateway.js";

export type CommandMenuParts = {
	readonly commandMenu: CommandMenuGateway;
	readonly menuFills: MenuFillsGateway;
};

export function commandMenuPartsOn({ config }: { readonly config: CommandMenuConfig }): CommandMenuParts {
	return {
		commandMenu: new MemoryCommandMenuGateway(),
		menuFills: new ConfiguredMenuFillsGateway(config),
	};
}
