import { failureMessage } from "@widgetarium/core/engine/failure-message.js";
import { createLineSplitter, plainText, readerNamed } from "@widgetarium/core/engine/provider-stream.js";
import type { Emit, LineSplitter, PlanUsage, StreamPart } from "@widgetarium/core/engine/provider-stream.js";
import type { AssistantBridge, ClaudeStart, ProviderFacts, TurnEvent } from "./assistant-bridge.js";

export type RunFailureKind = "silent" | "usage_limit" | "other";

export interface RunAnswer {
	readonly failure: string | null;
	readonly failureKind: RunFailureKind | null;
	readonly resumesAt: number | null;
}

export interface TurnRun {
	stop(): void;
	readonly done: Promise<RunAnswer>;
}

export interface TurnAsk {
	readonly provider: ProviderFacts;
	readonly prompt: string;
	readonly resume: string | null;
	readonly claude: ClaudeStart | null;
	readonly folders: readonly string[];
	readonly chatId: string | null;
}

export const IDLE_MS = 180000;

const TEXT_FORMAT = "text";

const ENDED_BADLY = "{command} exited with code {code}. {said}";
const ENDED_BY_A_SIGNAL = "{command} was ended by a signal before it finished. {said}";

const WENT_QUIET = "{command} produced nothing for {minutes} minutes, so it was stopped.";

const ASKING_IN_A_TERMINAL =
	"{command} is waiting for an answer it can only be given in a terminal — it is most likely not signed in. Run it once in your own terminal, then come back.";

const ASKS_IN_A_TERMINAL = /\[[YyNn]\/[YyNn]\]|\((?:y\/n|Y\/n|y\/N)\)/;

const SAYS_USAGE_LIMIT = /\busage limit\b|\b(?:5-hour|weekly|opus|session) limit reached\b/i;
const USAGE_LIMIT_RESET = /usage limit reached\|(\d{9,11})\b/i;
const MS_PER_SECOND = 1000;

const ANSWERED: RunAnswer = {
	failure: null,
	failureKind: null,
	resumesAt: null,
};

interface RunHeld {
	turnId: number | null;
	stopping: boolean;
	settled: boolean;
	streamFailure: string | null;
	usage: PlanUsage | null;
	quietTimer: ReturnType<typeof setTimeout> | undefined;
	readonly stderr: string[];
}

interface RunScope {
	readonly bridge: AssistantBridge;
	readonly ask: TurnAsk;
	readonly held: RunHeld;
	readonly settle: (answer: RunAnswer) => void;
}

export function runTurn(bridge: AssistantBridge, ask: TurnAsk, emit: Emit): TurnRun {
	const answered: { settle: (answer: RunAnswer) => void } = { settle: () => undefined };
	const done = new Promise<RunAnswer>((settle) => {
		answered.settle = settle;
	});
	const scope: RunScope = { bridge, ask, held: freshHeld(), settle: (answer) => answered.settle(answer) };
	begin(scope, emit);
	return { stop: () => stopProcess(scope), done };
}

export function failureAnswerOf(failure: string, usage: PlanUsage | null): RunAnswer {
	if (!SAYS_USAGE_LIMIT.test(failure)) {
		return {
			failure,
			failureKind: "other",
			resumesAt: null,
		};
	}

	return {
		failure,
		failureKind: "usage_limit",
		resumesAt: saidResetOf(failure) ?? fullestResetOf(usage),
	};
}

const said = (template: string, { ask }: RunScope): string => template.replace("{command}", ask.provider.label);

function finish(scope: RunScope, answer: RunAnswer): void {
	clearTimeout(scope.held.quietTimer);
	if (scope.held.settled) {
		return;
	}

	scope.held.settled = true;
	scope.settle(answer);
}

function stopProcess(scope: RunScope): void {
	scope.held.stopping = true;
	if (scope.held.turnId !== null) {
		void scope.bridge.stopTurn(scope.held.turnId).catch(() => undefined);
	}
}

function giveUp(scope: RunScope, answer: RunAnswer): void {
	finish(scope, answer);
	stopProcess(scope);
}

function heard(scope: RunScope): void {
	clearTimeout(scope.held.quietTimer);
	const minutes = String(Math.round(IDLE_MS / 60000));
	scope.held.quietTimer = setTimeout(
		() =>
			giveUp(scope, {
				failure: said(WENT_QUIET, scope).replace("{minutes}", minutes),
				failureKind: "silent",
				resumesAt: null,
			}),
		IDLE_MS,
	);
}

function exitAnswer(scope: RunScope, code: number | null): RunAnswer {
	if (scope.held.stopping) {
		return ANSWERED;
	}

	if (scope.held.streamFailure !== null) {
		return failureAnswerOf(scope.held.streamFailure, scope.held.usage);
	}

	if (code === 0) {
		return ANSWERED;
	}

	const stderr = scope.held.stderr.join("").trim();
	const ended = code === null ? ENDED_BY_A_SIGNAL : ENDED_BADLY.replace("{code}", String(code));
	return failureAnswerOf(said(ended, scope).replace("{said}", stderr).trim(), scope.held.usage);
}

// TRADE-OFF: a parser that throws is swallowed per line, because one unreadable line must not leave the turn spinning forever
function outputInto(scope: RunScope, emit: Emit): LineSplitter {
	const read = readerNamed(scope.ask.provider.outputFormat);
	return createLineSplitter((line) => {
		try {
			read(line, (part) => {
				holdRunFacts(scope.held, part);
				emit(part);
			});
		} catch (failure) {
			console.error("[widgetarium] a line of the agent's output could not be read", line, failure);
		}
	});
}

function holdRunFacts(held: RunHeld, part: StreamPart): void {
	if ("failure" in part) {
		held.streamFailure = part.failure;
	}

	if ("usage" in part) {
		held.usage = part.usage;
	}
}

function isAskingInATerminal(scope: RunScope, chunk: string): boolean {
	return scope.ask.provider.outputFormat === TEXT_FORMAT && ASKS_IN_A_TERMINAL.test(plainText(chunk));
}

function eventHandler(scope: RunScope, emit: Emit): (event: TurnEvent) => void {
	const output = outputInto(scope, emit);
	return (event) => {
		heard(scope);
		if (event.kind === "err") {
			scope.held.stderr.push(plainText(event.text));
			return;
		}

		if (event.kind === "exited") {
			output.end();
			finish(scope, exitAnswer(scope, event.code));
			return;
		}

		if (isAskingInATerminal(scope, event.text)) {
			giveUp(scope, {
				failure: said(ASKING_IN_A_TERMINAL, scope),
				failureKind: "other",
				resumesAt: null,
			});
			return;
		}

		output.push(event.text);
	};
}

function begin(scope: RunScope, emit: Emit): void {
	const { provider, prompt, resume, claude, folders, chatId } = scope.ask;
	heard(scope);
	scope.bridge
		.startTurn({ providerId: provider.id, prompt, resume, claude, folders, chatId }, eventHandler(scope, emit))
		.then((turnId) => {
			scope.held.turnId = turnId;
			if (scope.held.stopping) {
				stopProcess(scope);
			}
		})
		.catch((failed: unknown) => finish(scope, failureAnswerOf(failureMessage(failed), scope.held.usage)));
}

function freshHeld(): RunHeld {
	return {
		turnId: null,
		stopping: false,
		settled: false,
		streamFailure: null,
		usage: null,
		quietTimer: undefined,
		stderr: [],
	};
}

function saidResetOf(failure: string): number | null {
	const seconds = USAGE_LIMIT_RESET.exec(failure)?.[1];
	return seconds === undefined ? null : Number(seconds) * MS_PER_SECOND;
}

function fullestResetOf(usage: PlanUsage | null): number | null {
	const windows = [usage?.fiveHour ?? null, usage?.week ?? null].filter((window) => window !== null);
	const fullest = windows.sort((a, b) => b.used - a.used)[0];
	return fullest?.resetsAt ?? null;
}
