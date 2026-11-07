import type { HeldFile } from "../../shared/schema/held-file.schema.js";

export abstract class HeldFileGateway {
	abstract heldFile(): HeldFile | null;
	abstract saveHeldFile(file: HeldFile): void;
}
