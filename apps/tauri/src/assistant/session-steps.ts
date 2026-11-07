import type {
	AssistantCall,
	AssistantSession,
	AssistantTurn,
	TurnOutcome,
} from "@widgetarium/core/engine/assistant-port.js";
import { freshCallOf } from "@widgetarium/core/engine/assistant-port.js";
import type { StreamPart, ToolResult } from "@widgetarium/core/engine/provider-stream.js";

export const EMPTY_SESSION: AssistantSession = {
	turns: [],
	busy: false,
	failure: null,
	tool: null,
	phase: null,
	spent: 0,
	queued: [],
};

export function startedTurn(session: AssistantSession, asked: readonly string[], at: number): AssistantSession {
	return withStarted(session, [...asked.map((text) => questionOf(text, at)), freshAnswerOf(at)]);
}

export function heardMidTurn(session: AssistantSession, heard: readonly string[], at: number): AssistantSession {
	const paused = intoLastTurn(session, (turn) => (turn.role === "agent" ? { ...turn, endedAt: at } : turn));
	return {
		...paused,
		turns: [...paused.turns, ...heard.map((text) => questionOf(text, at)), freshAnswerOf(at)],
	};
}

export function startedCompact(session: AssistantSession, at: number): AssistantSession {
	return withStarted(session, [{ role: "compact", text: "", calls: [], startedAt: at }]);
}

export function endedTurn(session: AssistantSession, outcome: TurnOutcome, at: number): AssistantSession {
	const ended = intoLastTurn(session, (turn) =>
		turn.role !== "user" && turn.endedAt === undefined ? { ...turn, endedAt: at, outcome } : turn,
	);
	return { ...ended, busy: false, tool: null, phase: null };
}

export function withoutLastQuestion(session: AssistantSession): { session: AssistantSession; asked: string } | null {
	const lastAsked = session.turns.map((turn) => turn.role).lastIndexOf("user");
	const question = session.turns[lastAsked];
	if (question === undefined) {
		return null;
	}

	return { session: { ...session, turns: session.turns.slice(0, lastAsked), failure: null }, asked: question.text };
}

export function withoutLastCompact(session: AssistantSession): AssistantSession | null {
	if (session.turns.at(-1)?.role !== "compact") {
		return null;
	}

	return { ...session, turns: session.turns.slice(0, -1), failure: null };
}

export function withPart(session: AssistantSession, part: StreamPart, at: number): AssistantSession {
	if ("phase" in part) {
		return { ...session, phase: part.phase, tool: part.phase === "tools" ? session.tool : null };
	}

	if ("spentMore" in part) {
		return { ...session, spent: session.spent + part.spentMore };
	}

	if ("spent" in part) {
		return { ...session, spent: part.spent };
	}

	if ("text" in part) {
		return intoLastTurn(session, (turn) => ({ ...turn, text: turn.text + part.text }));
	}

	if ("call" in part) {
		const calling = { ...session, tool: part.call.name, phase: "tools" as const };
		return intoLastTurn(calling, (turn) => ({
			...turn,
			calls: [...turn.calls, freshCallOf(part.call, at, turn.text.length)],
		}));
	}

	if ("result" in part) {
		return intoTurnCalling(session, part.result.ref, (turn) => ({
			...turn,
			calls: answered(turn.calls, part.result, at),
		}));
	}

	if ("compacted" in part) {
		return part.compacted === "" ? session : intoLastTurn(session, (turn) => ({ ...turn, text: part.compacted }));
	}

	return "failure" in part ? { ...session, failure: part.failure } : session;
}

function intoLastTurn(session: AssistantSession, step: (turn: AssistantTurn) => AssistantTurn): AssistantSession {
	const last = session.turns.at(-1);
	if (last === undefined) {
		return session;
	}

	return { ...session, turns: [...session.turns.slice(0, -1), step(last)] };
}

function intoTurnCalling(
	session: AssistantSession,
	ref: string,
	step: (turn: AssistantTurn) => AssistantTurn,
): AssistantSession {
	const at = session.turns.map((turn) => turn.calls.some((call) => call.ref === ref)).lastIndexOf(true);

	if (at === -1) {
		return intoLastTurn(session, step);
	}

	return { ...session, turns: session.turns.map((turn, index) => (index === at ? step(turn) : turn)) };
}

function questionOf(text: string, at: number): AssistantTurn {
	return { role: "user", text, calls: [], startedAt: at };
}

function freshAnswerOf(at: number): AssistantTurn {
	return { role: "agent", text: "", calls: [], startedAt: at };
}

function answered(calls: readonly AssistantCall[], result: ToolResult, at: number): AssistantCall[] {
	return calls.map((call) =>
		call.ref === result.ref
			? { ...call, output: result.output, failed: result.failed, answered: true, answeredAt: at }
			: call,
	);
}

function withStarted(session: AssistantSession, started: readonly AssistantTurn[]): AssistantSession {
	return {
		turns: [...session.turns, ...started],
		busy: true,
		failure: null,
		tool: null,
		phase: "thinking",
		spent: 0,
		queued: session.queued,
	};
}
