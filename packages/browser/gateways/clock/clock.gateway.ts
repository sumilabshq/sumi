export abstract class ClockGateway {
	abstract now(): number;
	abstract after(ms: number, run: () => void): () => void;
}
