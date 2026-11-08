export abstract class ClockGateway {
	abstract now(): number;
}

export class SystemClockGateway extends ClockGateway {
	now(): number {
		return Date.now();
	}
}

export class FixedClockGateway extends ClockGateway {
	constructor(private at: number) {
		super();
	}

	now(): number {
		return this.at;
	}

	moveTo(at: number): void {
		this.at = at;
	}
}
