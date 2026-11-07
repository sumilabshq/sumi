import type { Switches } from "../../shared/schema/switches.schema.js";
import { SwitchesGateway } from "./switches.gateway.js";

export class MemorySwitchesGateway extends SwitchesGateway {
	constructor(private held: Switches) {
		super();
	}

	override switches(): Switches {
		return this.held;
	}

	override saveSwitches(switches: Switches): void {
		this.held = switches;
	}
}
