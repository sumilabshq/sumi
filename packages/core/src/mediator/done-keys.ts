import type { CommandAnswer } from "../gateway/run-handler";
import { token } from "./token";

export interface DoneKeys {
	once(key: string, run: () => Promise<CommandAnswer<unknown>>): Promise<CommandAnswer<unknown>>;
}

export const DoneKeys = token<DoneKeys>("DoneKeys");

export class MemoryDoneKeys implements DoneKeys {
	private readonly answers = new Map<string, Promise<CommandAnswer<unknown>>>();

	once(key: string, run: () => Promise<CommandAnswer<unknown>>): Promise<CommandAnswer<unknown>> {
		const known = this.answers.get(key);
		if (known !== undefined) return known;
		const answer = run().then((settled) => {
			if (!settled.ok && !settled.ran) this.answers.delete(key);
			return settled;
		});
		this.answers.set(key, answer);
		return answer;
	}
}
