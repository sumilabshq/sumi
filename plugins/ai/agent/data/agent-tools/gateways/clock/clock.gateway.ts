export abstract class ClockGateway {
	abstract now(): Date;
	abstract pause(ms: number): Promise<void>;
}
