import type { HeldFile } from "../../shared/schema/held-file.schema.js";
import { HeldFileGateway } from "./held-file.gateway.js";

export class MemoryHeldFileGateway extends HeldFileGateway {
	private held: HeldFile | null = null;

	override heldFile(): HeldFile | null {
		return this.held;
	}

	override saveHeldFile(file: HeldFile): void {
		this.held = file;
	}
}
