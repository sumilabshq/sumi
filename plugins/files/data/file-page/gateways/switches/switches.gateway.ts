import type { Switches } from "../../shared/schema/switches.schema.js";

export abstract class SwitchesGateway {
	abstract switches(): Switches;
	abstract saveSwitches(switches: Switches, reason: string): void;
}
