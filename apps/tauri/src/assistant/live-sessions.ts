import { failureMessage } from "@widgetarium/core/engine/failure-message.js";
import type { LiveInput } from "@widgetarium/core/engine/assistant-port.js";
import { createLineSplitter, plainText, readerNamed } from "@widgetarium/core/engine/provider-stream.js";
import type { Emit, LineSplitter, PlanUsage, StreamPart } from "@widgetarium/core/engine/provider-stream.js";
import type { AssistantBridge, TurnEvent } from "./assistant-bridge.js";
import { isSessionFact } from "./session-steps.js";
import {
	ANSWERED,
	IDLE_MS,
	endedAnswerOf,
	failureAnswerOf,
	holdBackground,
	launchOf,
	quietFailureOf,
	runLaunch,
} from "./turn-run.js";
import type { RunAnswer, TurnAsk, TurnRun } from "./turn-run.js";

export type HeardIdle = (chatId: string, part: StreamPart, stop: () => void) => void;

const SESSION_ENDED = "The chat session ended before this background agent finished.";
const STDERR_KEPT = 40;
const NOT_WAITING = (): Promise<boolean> => Promise.resolve(false);

interface LiveTurn {
	readonly emit: Emit;
	readonly settle: (answer: RunAnswer) => void;
	readonly isWaitingOnPerson: () => Promise<boolean>;
	streamFailure: string | null;
	quietTimer: ReturnType<typeof setTimeout> | undefined;
}

interface LiveProcess {
	readonly chatId: string;
	readonly label: string;
	readonly key: string;
	readonly stopLine: string;
	readonly splitter: LineSplitter;
	readonly stderr: string[];
	readonly backgroundWorking: Set<string>;
	turnId: number | null;
	turn: LiveTurn | null;
	usage: PlanUsage | null;
	isDraining: boolean;
	isRetired: boolean;
}

interface TurnHeld {
	process: LiveProcess | null;
	unlive: TurnRun | null;
	isStopping: boolean;
}

export class LiveSessions {
	private readonly byChat = new Map<string, LiveProcess>();

	constructor(
		private readonly bridge: AssistantBridge,
		private readonly heardIdle: HeardIdle,
	) {}

	run(ask: TurnAsk, emit: Emit): TurnRun {
		const answered: { settle: (answer: RunAnswer) => void } = { settle: () => undefined };
		const done = new Promise<RunAnswer>((settle) => {
			answered.settle = settle;
		});
		const turn: LiveTurn = {
			emit,
			settle: (answer) => answered.settle(answer),
			isWaitingOnPerson: ask.isWaitingOnPerson ?? NOT_WAITING,
			streamFailure: null,
			quietTimer: undefined,
		};
		const held: TurnHeld = { process: null, unlive: null, isStopping: false };
		this.begin(ask, turn, held).catch((failed: unknown) => finishTurn(turn, failureAnswerOf(failureMessage(failed), null)));
		return { stop: () => this.stopTurn(turn, held), done };
	}

	end(chatId: string): void {
		const live = this.byChat.get(chatId);

		if (live === undefined) {
			return;
		}

		this.retire(live, "the chat was cleared");
		if (live.turnId !== null) {
			void this.bridge.stopTurn(live.turnId).catch(() => undefined);
		}
	}

	private async begin(ask: TurnAsk, turn: LiveTurn, held: TurnHeld): Promise<void> {
		const launch = await launchOf(this.bridge, ask);

		if (launch.live === undefined || ask.chatId === null) {
			held.unlive = runLaunch({ bridge: this.bridge, ask, launch: Promise.resolve(launch) }, turn.emit);
			void held.unlive.done.then(turn.settle);
			return;
		}

		const live = this.processFor(ask.chatId, launch.live, ask);
		held.process = live;
		live.turn = turn;
		this.armQuiet(live, turn);

		if (live.turnId === null) {
			live.turnId = await this.bridge.startLaunch(launch, (event) => this.heard(live, event));
			console.info(`[ink-assistant] chat ${live.chatId}: live session none → listening (turn ${live.turnId})`);
		} else {
			await this.bridge.writeTurn(live.turnId, launch.live.said);
		}

		if (held.isStopping) {
			this.interrupt(live);
		}
	}

	private processFor(chatId: string, input: LiveInput, ask: TurnAsk): LiveProcess {
		const live = this.byChat.get(chatId);

		if (live !== undefined && live.key === input.key) {
			return live;
		}

		if (live !== undefined && live.backgroundWorking.size > 0) {
			console.info(
				`[ink-assistant] chat ${chatId}: options changed → kept the live session until its ${live.backgroundWorking.size} background agents end`,
			);
			return live;
		}

		if (live !== undefined) {
			this.retire(live, "its options changed");
		}

		const read = readerNamed(ask.provider.outputFormat);
		const made: LiveProcess = {
			chatId,
			label: ask.provider.label,
			key: input.key,
			stopLine: input.stop,
			splitter: createLineSplitter((line) => {
				try {
					read(line, (part) => this.route(made, part));
				} catch (failure) {
					console.error("[widgetarium] a line of the agent's output could not be read", line, failure);
				}
			}),
			stderr: [],
			backgroundWorking: new Set(),
			turnId: null,
			turn: null,
			usage: null,
			isDraining: false,
			isRetired: false,
		};
		this.byChat.set(chatId, made);
		return made;
	}

	private retire(live: LiveProcess, why: string): void {
		live.isRetired = true;
		if (this.byChat.get(live.chatId) === live) {
			this.byChat.delete(live.chatId);
		}

		console.info(`[ink-assistant] chat ${live.chatId}: live session listening → closing (${why})`);
		if (live.turnId !== null) {
			void this.bridge.closeTurn(live.turnId).catch(() => undefined);
		}
	}

	private heard(live: LiveProcess, event: TurnEvent): void {
		if (live.turn !== null) {
			this.armQuiet(live, live.turn);
		}

		if (event.kind === "err") {
			live.stderr.push(plainText(event.text));
			live.stderr.splice(0, Math.max(0, live.stderr.length - STDERR_KEPT));
			return;
		}

		if (event.kind === "exited") {
			live.splitter.end();
			this.exited(live, event.code);
			return;
		}

		live.splitter.push(event.text);
	}

	private route(live: LiveProcess, part: StreamPart): void {
		if ("background" in part) {
			holdBackground(live.backgroundWorking, part.background);
		}

		if ("usage" in part) {
			live.usage = part.usage;
		}

		if (live.isDraining && !isSessionFact(part)) {
			live.isDraining = !("answered" in part);
			return;
		}

		const turn = live.turn;
		if (turn !== null) {
			this.toTurn(live, turn, part);
			return;
		}

		this.heardIdle(live.chatId, part, () => this.interrupt(live));
	}

	private toTurn(live: LiveProcess, turn: LiveTurn, part: StreamPart): void {
		if ("failure" in part) {
			turn.streamFailure = part.failure;
		}

		turn.emit(part);

		if (!("answered" in part)) {
			return;
		}

		live.turn = null;
		finishTurn(turn, turn.streamFailure === null ? ANSWERED : failureAnswerOf(turn.streamFailure, live.usage));
	}

	private interrupt(live: LiveProcess): void {
		live.isDraining = true;
		if (live.turnId !== null) {
			void this.bridge.writeTurn(live.turnId, live.stopLine).catch(() => undefined);
		}
	}

	private stopTurn(turn: LiveTurn, held: TurnHeld): void {
		held.isStopping = true;
		held.unlive?.stop();
		const live = held.process;

		if (live === null || live.turn !== turn) {
			return;
		}

		live.turn = null;
		this.interrupt(live);
		finishTurn(turn, ANSWERED);
	}

	private armQuiet(live: LiveProcess, turn: LiveTurn): void {
		clearTimeout(turn.quietTimer);
		turn.quietTimer = setTimeout(() => void this.checkQuiet(live, turn), IDLE_MS);
	}

	private async checkQuiet(live: LiveProcess, turn: LiveTurn): Promise<void> {
		if (live.turn !== turn) {
			return;
		}

		if (live.backgroundWorking.size > 0 || (await turn.isWaitingOnPerson())) {
			this.armQuiet(live, turn);
			return;
		}

		live.turn = null;
		finishTurn(turn, quietFailureOf(live.label));
		this.retire(live, "it went quiet");
		if (live.turnId !== null) {
			void this.bridge.stopTurn(live.turnId).catch(() => undefined);
		}
	}

	private exited(live: LiveProcess, code: number | null): void {
		console.info(`[ink-assistant] chat ${live.chatId}: live session listening → exited (code ${String(code)})`);
		if (this.byChat.get(live.chatId) === live) {
			this.byChat.delete(live.chatId);
		}

		const turn = live.turn;
		live.turn = null;
		if (turn !== null) {
			const answer =
				turn.streamFailure === null
					? endedAnswerOf({ label: live.label, code, stderr: live.stderr, usage: live.usage })
					: failureAnswerOf(turn.streamFailure, live.usage);
			finishTurn(turn, answer);
		}

		for (const id of live.backgroundWorking) {
			this.heardIdle(live.chatId, { background: { kind: "ended", id, end: "stopped", said: SESSION_ENDED } }, () => undefined);
		}
		live.backgroundWorking.clear();
	}
}

function finishTurn(turn: LiveTurn, answer: RunAnswer): void {
	clearTimeout(turn.quietTimer);
	turn.settle(answer);
}
