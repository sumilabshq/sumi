import type { Switches } from "../../shared/lib/switch-plan.js";
import { SwitchesGateway } from "./switches.gateway.js";

export class MemorySwitchesGateway extends SwitchesGateway {
	private held: Switches = {};

	override switches(): Promise<Switches> {
		return Promise.resolve(this.held);
	}

	override change(changes: Switches): Promise<void> {
		this.held = { ...this.held, ...changes };
		return Promise.resolve();
	}
}
