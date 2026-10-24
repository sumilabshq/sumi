import type { ModuleFacts } from "@widgetarium/core/requests";
import type { CommandMenuGateway } from "../command-menu/command-menu.gateway.js";
import { MemoryCommandMenuGateway } from "../command-menu/memory.gateway.js";

export type CommandMenuParts = {
	readonly commandMenu: CommandMenuGateway;
};

export function commandMenuPartsOn(_facts: ModuleFacts): CommandMenuParts {
	return { commandMenu: new MemoryCommandMenuGateway() };
}
