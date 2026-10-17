import { ClockGateway } from "./clock.gateway.js";

export class SystemClockGateway extends ClockGateway {
	now(): number {
		return Date.now();
	}

	after(ms: number, run: () => void): () => void {
		const timer = setTimeout(run, ms);
		return () => clearTimeout(timer);
	}
}
