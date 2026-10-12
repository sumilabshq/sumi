import { useCallback, useRef, useState } from "react";
import { stableKey } from "./gateway/stable-key";
import type { CommandAnswer } from "./gateway/run-handler";
import type { DrawnCommand } from "./declared-command.js";
import type { BoundCommandHandle, CommandHandle, CommandState } from "./handle-types.js";

type Run = (input: unknown) => Promise<CommandAnswer<unknown>>;
type BoundRun = () => Promise<CommandAnswer<unknown>>;

interface InputRuns {
	readonly running: number;
	readonly refusal: string | null;
	readonly latest: number;
}

interface Runs extends InputRuns {
	readonly byInput: Readonly<Record<string, InputRuns>>;
}

interface BoundRuns {
	readonly now: Map<string, BoundRun>;
	readonly before: Map<string, BoundRun>;
}

const IDLE: InputRuns = { running: 0, refusal: null, latest: 0 };
const NO_RUNS: Runs = { ...IDLE, byInput: {} };
const ALREADY_RUNNING = "{name} is already running";

export function useCommandHandle(name: string, command: DrawnCommand): CommandHandle<unknown, unknown> {
	const latest = useRef(command);
	latest.current = command;
	const [runs, setRuns] = useState<Runs>(NO_RUNS);
	const started = useRef(0);
	const runningKeys = useRef(new Set<string>());
	const run: Run = useCallback(
		async (input) => {
			const key = stableKey(input);
			if (runningKeys.current.has(key))
				return { ok: false, reason: ALREADY_RUNNING.replace("{name}", name), ran: false };
			runningKeys.current.add(key);
			started.current += 1;
			const id = started.current;
			setRuns((now) => withRunStarted(now, key, id));
			const answer = await latest.current(input);
			runningKeys.current.delete(key);
			setRuns((now) => withRunEnded(now, key, id, answer.ok ? null : answer.reason));
			return answer;
		},
		[name],
	);
	const boundRunOf = useBoundRuns(runs, run);
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
		return { ...stateOf(runs.byInput[key] ?? IDLE), run: boundRunOf(key, input) };
	};
	return { ...stateOf(runs), run, with: withInput };
}

function useBoundRuns(runs: Runs, run: Run): (key: string, input: unknown) => BoundRun {
	const cache = useRef<BoundRuns>({ now: new Map(), before: new Map() });
	const { now } = cache.current;
	cache.current = { now: new Map([...now].filter(([key]) => key in runs.byInput)), before: now };
	return (key, input) => {
		const bound = cache.current.now.get(key) ?? cache.current.before.get(key) ?? (() => run(input));
		cache.current.now.set(key, bound);
		return bound;
	};
}

function withRunStarted(runs: Runs, key: string, id: number): Runs {
	const one = runs.byInput[key] ?? IDLE;
	return {
		...runs,
		running: runs.running + 1,
		latest: id,
		byInput: { ...runs.byInput, [key]: { ...one, running: one.running + 1, latest: id } },
	};
}

function withRunEnded(runs: Runs, key: string, id: number, refusal: string | null): Runs {
	const one = withOneEnded(runs.byInput[key] ?? IDLE, id, refusal);
	const others = Object.fromEntries(Object.entries(runs.byInput).filter(([held]) => held !== key));
	const byInput = one.running === 0 && one.refusal === null ? others : { ...others, [key]: one };
	return { ...withOneEnded(runs, id, refusal), byInput };
}

function withOneEnded(one: InputRuns, id: number, refusal: string | null): InputRuns {
	const running = Math.max(0, one.running - 1);
	return { running, refusal: one.latest === id ? refusal : one.refusal, latest: one.latest };
}
