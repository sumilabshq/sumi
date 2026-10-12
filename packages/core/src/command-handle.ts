import { useCallback, useRef, useState } from "react";
import { stableKey } from "./gateway/stable-key";
import type { CommandAnswer } from "./gateway/run-handler";
import { isObject } from "./engine/is-object.js";
import type { DrawnCommand } from "./declared-command.js";
import type { BoundCommandHandle, CommandHandle, CommandState } from "./handle-types.js";

type Run = (input: unknown) => Promise<CommandAnswer<unknown>>;
type BoundRun = () => Promise<CommandAnswer<unknown>>;

interface InputRuns {
	readonly running: number;
	readonly refusal: string | null;
}

interface Runs extends InputRuns {
	readonly byInput: Readonly<Record<string, InputRuns>>;
}

const IDLE: InputRuns = { running: 0, refusal: null };
const NO_RUNS: Runs = { ...IDLE, byInput: {} };

export function useCommandHandle(command: DrawnCommand): CommandHandle<unknown, unknown> {
	const latest = useRef(command);
	latest.current = command;
	const [runs, setRuns] = useState<Runs>(NO_RUNS);
	const run: Run = useCallback(async (input) => {
		const key = stableKey(input);
		setRuns((now) => withRunStarted(now, key));
		try {
			const answer = await latest.current(input);
			setRuns((now) => withRunEnded(now, key, answer.ok ? null : answer.reason));
			return answer;
		} catch (thrown: unknown) {
			setRuns((now) => withRunEnded(now, key, reasonOf(thrown)));
			throw thrown;
		}
	}, []);
	const boundRuns = useRef(new Map<string, BoundRun>());
	const allowed = command.can();
	const can = allowed.can;
	const cannotBecause = allowed.can ? null : allowed.reason;
	const stateOf = (one: InputRuns): CommandState => ({
		isRunning: one.running > 0,
		refusal: one.refusal,
		can,
		cannotBecause,
	});
	const withInput = (input: unknown): BoundCommandHandle<unknown> => {
		const key = stableKey(input);
		const bound = boundRuns.current.get(key) ?? (() => run(input));
		boundRuns.current.set(key, bound);
		return { ...stateOf(runs.byInput[key] ?? IDLE), run: bound };
	};
	return { ...stateOf(runs), run, with: withInput };
}

function withRunStarted(runs: Runs, key: string): Runs {
	const one = runs.byInput[key] ?? IDLE;
	return {
		...runs,
		running: runs.running + 1,
		byInput: { ...runs.byInput, [key]: { ...one, running: one.running + 1 } },
	};
}

function withRunEnded(runs: Runs, key: string, refusal: string | null): Runs {
	const one = runs.byInput[key] ?? IDLE;
	return {
		running: Math.max(0, runs.running - 1),
		refusal,
		byInput: { ...runs.byInput, [key]: { running: Math.max(0, one.running - 1), refusal } },
	};
}

function reasonOf(thrown: unknown): string {
	if (isObject(thrown) && typeof thrown["message"] === "string") return thrown["message"];
	return String(thrown);
}
