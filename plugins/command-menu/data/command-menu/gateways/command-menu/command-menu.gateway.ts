import type { KeptMenu } from "../../shared/schema/command-menu.schema.js";

export abstract class CommandMenuGateway {
	abstract menu(): KeptMenu;
	abstract saveMenu(menu: KeptMenu, reason: string): void;
	abstract menuChanged(listener: () => void): () => void;
}
