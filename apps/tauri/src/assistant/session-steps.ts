import type {
	AssistantCall,
	AssistantSession,
	BackgroundAgent,
	AssistantTurn,
	SentPictures,
	TurnOutcome,
} from "@widgetarium/core/engine/assistant-port.js";
import { freshCallOf } from "@widgetarium/core/engine/assistant-port.js";
import type { BackgroundChange, StreamPart, ToolResult } from "@widgetarium/core/engine/provider-stream.js";

export const EMPTY_SESSION: AssistantSession = {
	turns: [],
	busy: false,
	failure: null,
	tool: null,
	phase: null,
	spent: 0,
	context: null,
	queued: [],
	background: [],
};

export interface AskedMessage {
	readonly text: string;
	readonly pictures?: SentPictures | undefined;
}

export function askedMessageOf(text: string, pictures: SentPictures | undefined): AskedMessage {
	if (pictures === undefined || Object.keys(pictures).length === 0) {
		return { text };
	}

	return { text, pictures };
}

export function startedTurn(session: AssistantSession, asked: readonly AskedMessage[], at: number): AssistantSession {
	return withStarted(session, [...asked.map((message) => questionOf(message, at)), freshAnswerOf(at)]);
}

export function heardMidTurn(session: AssistantSession, heard: readonly AskedMessage[], at: number): AssistantSession {
	const paused = intoLastTurn(session, (turn) => (turn.role === "agent" ? { ...turn, endedAt: at } : turn));
	return {
		...paused,
		turns: [...paused.turns, ...heard.map((message) => questionOf(message, at)), freshAnswerOf(at)],
	};
}

export function startedUnasked(session: AssistantSession, at: number): AssistantSession {
	return withStarted(session, [freshAnswerOf(at)]);
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

export function withoutLastQuestion(
	session: AssistantSession,
): { session: AssistantSession; asked: AskedMessage } | null {
	const lastAsked = session.turns.map((turn) => turn.role).lastIndexOf("user");
	const question = session.turns[lastAsked];
	if (question === undefined) {
		return null;
	}

	return {
		session: { ...session, turns: session.turns.slice(0, lastAsked), failure: null },
		asked: askedMessageOf(question.text, question.pictures),
	};
}

export function withoutLastCompact(session: AssistantSession): AssistantSession | null {
	if (session.turns.at(-1)?.role !== "compact") {
		return null;
	}

	return { ...session, turns: session.turns.slice(0, -1), failure: null };
}

export function isSessionFact(part: StreamPart): boolean {
	return ["background", "usage", "session", "spent", "spentMore", "context"].some((fact) => fact in part);
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

	if ("context" in part) {
		return { ...session, context: part.context };
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

	if ("background" in part) {
		return { ...session, background: withBackgroundChange(session.background, part.background, at) };
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

function questionOf({ text, pictures }: AskedMessage, at: number): AssistantTurn {
	const question: AssistantTurn = { role: "user", text, calls: [], startedAt: at };
	return pictures === undefined ? question : { ...question, pictures };
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
		context: session.context,
		queued: session.queued,
		background: session.background,
	};
}

function withBackgroundChange(
	background: readonly BackgroundAgent[],
	change: BackgroundChange,
	at: number,
): readonly BackgroundAgent[] {
	if (change.kind === "started") {
		const started: BackgroundAgent = {
			id: change.id,
			ref: change.ref,
			title: change.title,
			state: "working",
			said: "",
			startedAt: at,
			endedAt: null,
		};
		return [...background.filter(({ id }) => id !== change.id), started];
	}

	return background.map((agent) => (agent.id === change.id ? changedAgent(agent, change, at) : agent));
}

function changedAgent(agent: BackgroundAgent, change: BackgroundChange, at: number): BackgroundAgent {
	if (change.kind === "progress") {
		return { ...agent, said: change.said };
	}

	if (change.kind === "ended") {
		return { ...agent, state: change.end, said: change.said, endedAt: at };
	}

	return agent;
}
