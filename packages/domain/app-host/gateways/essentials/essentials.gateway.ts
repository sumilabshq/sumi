import type { KeptEssentials } from "../../shared/schema/essential.schema.js";

export abstract class EssentialsGateway {
	abstract kept(): KeptEssentials | null;
	abstract keep(essentials: KeptEssentials): void;
}
