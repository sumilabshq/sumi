import { ClockGateway } from "./clock.gateway.js";

export class SystemClockGateway extends ClockGateway {
	now(): number {
		return Date.now();
	}
}
