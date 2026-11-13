import { ClockGateway } from "./clock.gateway.js";

export class SystemClockGateway extends ClockGateway {
	now(): Date {
		return new Date();
	}

	pause(ms: number): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}
}
