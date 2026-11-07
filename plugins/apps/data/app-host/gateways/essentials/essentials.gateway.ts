import type { KeptEssentials } from "../../shared/schema/essential.schema.js";

export abstract class EssentialsGateway {
	abstract essentialsLoaded(): Promise<void>;
	abstract essentials(): KeptEssentials | null;
	abstract saveEssentials(essentials: KeptEssentials, reason: string): void;
	abstract essentialsChanged(listener: () => void): () => void;
}
