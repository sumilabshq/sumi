const UNREACHED_KEPT_MINUTES = 5;
const UNREACHED_KEPT_MS = UNREACHED_KEPT_MINUTES * 60 * 1000;

interface Reached {
	readonly isReached: boolean;
}

// TRADE-OFF: a back-off per address held in memory: an unreached site is never written to the cache
export class AskedOnce<Answer extends Reached> {
	private readonly asking = new Map<string, Promise<Answer>>();
	private readonly unreachedAt = new Map<string, number>();

	constructor(
		private readonly unreached: (address: string) => Answer,
		private readonly now: () => number,
	) {}

	answerOf(address: string, ask: () => Promise<Answer>): Promise<Answer> {
		const asked = this.asking.get(address);

		if (asked !== undefined) {
			return asked;
		}

		if (this.isBackingOff(address)) {
			return Promise.resolve(this.unreached(address));
		}

		const answered = ask()
			.then((answer) => this.noteReach(address, answer))
			.finally(() => this.asking.delete(address));
		this.asking.set(address, answered);
		return answered;
	}

	private isBackingOff(address: string): boolean {
		const at = this.unreachedAt.get(address);
		return at !== undefined && this.now() - at < UNREACHED_KEPT_MS;
	}

	private noteReach(address: string, answer: Answer): Answer {
		if (answer.isReached) {
			this.unreachedAt.delete(address);
			return answer;
		}

		this.unreachedAt.set(address, this.now());
		console.info(`[widgetarium] site file ${address} not reached → asked again after ${UNREACHED_KEPT_MINUTES} min`);
		return answer;
	}
}
