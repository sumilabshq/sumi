import type { KeptMenu } from "../../shared/schema/command-menu.schema.js";
import { CommandMenuGateway } from "./command-menu.gateway.js";

export const SHUT_MENU: KeptMenu = {
	isOpen: false,
	door: "anywhere",
	text: "",
	opening: 0,
};

export class MemoryCommandMenuGateway extends CommandMenuGateway {
	private readonly listeners = new Set<() => void>();

	constructor(private held: KeptMenu = SHUT_MENU) {
		super();
	}

	menu(): KeptMenu {
		return this.held;
	}

	saveMenu(menu: KeptMenu): void {
		this.held = menu;
		for (const listener of [...this.listeners]) {
			listener();
		}
	}

	menuChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
