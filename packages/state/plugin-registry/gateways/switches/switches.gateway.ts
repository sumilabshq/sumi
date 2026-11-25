import type { Switches } from "../../shared/lib/switch-plan.js";

export abstract class SwitchesGateway {
	abstract switches(): Promise<Switches>;
	abstract change(changes: Switches, reason: string): Promise<void>;
}
