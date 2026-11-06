import { useCallback, useContext, useRef, useState } from "react";
import { REFUSAL_HANDLER } from "./command-refusals";
import type { RefusalHandler } from "./command-refusals";
import { stableKey } from "./gateway/stable-key";
import type { CommandAnswer } from "./gateway/run-handler";
import type { Action } from "./gateway/contract";
import type { BoundCommandHandle, CommandHandle, CommandState } from "./handle-types.js";
import { reasonOf } from "./answer";
import { APP } from "./app-context";
import { reportToConsole } from "./report-failure";
import type { FailureReport } from "./report-failure";

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

interface Told {
	readonly onRefused: RefusalHandler;
	readonly reportFailure: FailureReport;
}

interface BoundRuns {
	readonly now: Map<string, BoundRun>;
	readonly before: Map<string, BoundRun>;
}

const IDLE: InputRuns = { running: 0, refusal: null, latest: 0 };
const NO_RUNS: Runs = { ...IDLE, byInput: {} };
const ALREADY_RUNNING = "{name} is already running";

export function useCommandHandle(
	name: string,
	command: Action<unknown, CommandAnswer<unknown>>,
): CommandHandle<unknown, unknown> {
	const latest = useRef(command);
	latest.current = command;
	const onRefused = useContext(REFUSAL_HANDLER);
	const reportFailure = useContext(APP)?.reportFailure ?? reportToConsole;
	const told = useRef<Told>({ onRefused, reportFailure });
	told.current = { onRefused, reportFailure };
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
			const ended: { refusal: string | null } = { refusal: null };
			try {
				const answer = await answerOrRefusal(latest.current, input, name, told.current);
				ended.refusal = answer.ok ? null : answer.reason;
				return answer;
			} finally {
				runningKeys.current.delete(key);
				setRuns((now) => withRunEnded(now, key, id, ended.refusal));
			}
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

async function answerOrRefusal(
	command: Run,
	input: unknown,
	name: string,
	told: Told,
): Promise<CommandAnswer<unknown>> {
	try {
		return await command(input);
	} catch (thrown) {
		const reason = reasonOf(thrown);
		told.reportFailure({ source: name, reason, code: "failed", ran: false, thrown });
		told.onRefused({ name, reason, ran: false });
		return { ok: false, reason, ran: false };
	}
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
