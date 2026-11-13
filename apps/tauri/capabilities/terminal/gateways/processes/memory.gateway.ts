import { ProcessesGateway } from "./processes.gateway.js";

export const NO_PROCESSES = "this host runs no processes";

export class MemoryProcessesGateway extends ProcessesGateway {
	override start(): Promise<void> {
		return Promise.reject(new Error(NO_PROCESSES));
	}

	override stop(): Promise<void> {
		return Promise.resolve();
	}
}
